// Minimal GEDCOM parser implementation in TypeScript
import { createDefaultNodeFactory, GedcomNode, NodeFactory } from "./node.js";
import {
  applyDecoders,
  createDefaultRegistry,
  DecoderRegistry,
} from "./decoder.js";

import { resolvePointers } from "./pointer.js";

/**
 * Options you can pass to the parser to control behavior and extension
 * points. All fields are optional; sensible defaults are used by the parser.
 */
export interface ParseOptions {
  /** when true (default), the parser will resolve pointer references to
   * actual `GedcomNode` objects after parsing. Set to false to avoid the
   * extra resolution pass when you only need the raw nodes.
   */
  resolvePointers?: boolean;
  /** optional custom node factory to construct richer node instances */
  nodeFactory?: NodeFactory;
  /** optional decoder registry instance for parsing values */
  registry?: DecoderRegistry;
}

/**
 * The result returned from the parser. Contains the top-level nodes and
 * helpers for looking up nodes by id and resolving pointers after the fact.
 */
export interface ParseResult {
  /** top-level nodes parsed from the source (records at level 0) */
  nodes: GedcomNode[]; // top-level nodes (e.g. multiple records)
  /** map from pointer id ("@I1@") to the corresponding node for quick lookup */
  byId: Record<string, GedcomNode>; // optional index of nodes by pointer id
  /** the decoder registry used during parsing (when available) */
  registry?: DecoderRegistry;
  /**
   * optional helper to perform pointer resolution after parse. When present
   * calling this will attempt to populate `GedcomPointer.ref` for pointer
   * values and any cross-reference helpers your NodeFactory may expose.
   */
  resolvePointers?: (options?: { timeoutMs?: number }) => Promise<void>;
}

function parseLine(line: string) {
  line = line.replace(/\r$/, "");
  if (!line.trim()) return null;
  const m = line.match(
    /^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_@]+)(?:\s(.*))?$/
  );
  if (!m) return { raw: line, invalid: true } as const;
  const level = parseInt(m[1], 10);
  let pointer: string | undefined,
    tag: string | undefined,
    value: string | undefined;
  if (m[2] && m[3]) {
    pointer = m[2];
    tag = m[3];
    value = m[4] !== undefined ? m[4] : undefined;
  } else {
    const tokens = line.split(/\s+/).slice(1);
    if (
      tokens[0] &&
      tokens[0].startsWith("@") &&
      tokens[0].endsWith("@") &&
      tokens[1]
    ) {
      pointer = tokens[0];
      tag = tokens[1];
      const rest = tokens.slice(2).join(" ");
      value = rest === "" ? undefined : rest;
    } else {
      tag = m[3];
      value = m[4] !== undefined ? m[4] : undefined;
    }
  }
  return { level, pointer, tag, value, raw: line };
}

/**
 * Synchronous parser core: feed lines synchronously, then call finish() to get result.
 */
class Parser {
  private roots: GedcomNode[] = [];
  private stack: Array<GedcomNode | undefined> = [];
  private byId: Record<string, GedcomNode> = {};
  private options: ParseOptions;

  constructor(options: ParseOptions = {}) {
    this.options = options;
  }

  feed(rawLine: string) {
    const parsed = parseLine(String(rawLine));
    if (!parsed) return;
    const { level, pointer, tag, value } = parsed as any;

    // handle CONT/CONC
    if ((tag === "CONC" || tag === "CONT") && level > 0) {
      const parent = this.stack[level - 1] as GedcomNode;
      if (parent) {
        let append = value !== undefined ? value : "";
        if (tag === "CONT") append = "\n" + append;
        parent.rawValue += append;
        if ((parent.value as string) != null) {
          parent.value += append;
        }
      }
      return;
    }

    const factory = this.options.nodeFactory ?? createDefaultNodeFactory();
    const node = factory(tag as string, value as string | undefined, null, {});
    if (pointer) {
      node.id = pointer as string;
      this.byId[pointer as string] = node;
    }
    this.attach(node, level as number);
  }

  private attach(node: GedcomNode, level: number) {
    if (level === 0) {
      this.roots.push(node);
    } else {
      const parent = this.stack[level - 1];
      if (parent) {
        node.parent = parent;
        parent.children.push(node);
      } else {
        this.roots.push(node);
      }
    }
    this.stack[level] = node;
    for (let i = level + 1; i < this.stack.length; i++)
      this.stack[i] = undefined;
  }

  // decoding delegated to registry via finish()

  finish() {
    // Apply decoders using the effective registry
    const effectiveRegistry = this.options.registry ?? createDefaultRegistry();
    applyDecoders(this.roots, effectiveRegistry);

    const result = {
      nodes: this.roots,
      byId: this.byId,
      resolvePointers: (opts?: any) =>
        resolvePointers({ nodes: this.roots, byId: this.byId }, opts),
    };
    if (this.options.resolvePointers ?? true) {
      result.resolvePointers();
    }
    return result;
  }
}

/**
 * Convert various input sources into an async iterable of lines (strings).
 * Accepts:
 *  - string
 *  - Web ReadableStream (has getReader)
 *  - AsyncIterable of chunks (Node Readable is AsyncIterable of Buffer/string)
 */
async function* linesFrom(
  input: string | AsyncIterable<any> | ReadableStream
): AsyncIterable<string> {
  let buffer = "";
  const decoder = new TextDecoder();

  // Helper to push complete lines from buffer
  const flushLines = function* () {
    const parts = buffer.split(/\n/);
    for (let i = 0; i < parts.length - 1; i++) yield parts[i];
    buffer = parts[parts.length - 1] || "";
  };

  if (typeof input === "string") {
    let src = String(input);
    if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
    for (const line of src.split(/\n/)) yield line;
    return;
  }

  // Web ReadableStream
  if (input && typeof (input as any).getReader === "function") {
    const reader = (input as any).getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk =
          value instanceof Uint8Array ? decoder.decode(value) : String(value);
        buffer += chunk;
        for (const l of flushLines()) yield l.replace(/\r$/, "");
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {}
    }
    if (buffer) yield buffer.replace(/\r$/, "");
    return;
  }

  // AsyncIterable (Node Readable or any async iterable of chunks)
  if (typeof (input as any)[Symbol.asyncIterator] === "function") {
    for await (const chunk of input as AsyncIterable<any>) {
      let s: string;
      if (typeof chunk === "string") s = chunk;
      else if (chunk instanceof Uint8Array) s = decoder.decode(chunk);
      else if (chunk && typeof chunk.toString === "function")
        s = chunk.toString();
      else s = String(chunk);
      buffer += s;
      for (const l of flushLines()) yield l.replace(/\r$/, "");
    }
    if (buffer) yield buffer.replace(/\r$/, "");
    return;
  }

  throw new Error("Unsupported stream input");
}

/**
 * Parses GEDCOM data from a string, Web ReadableStream, or AsyncIterable.
 * @param input - GEDCOM data as string, ReadableStream, or AsyncIterable
 * @param options - Parser options
 * @returns Parsed GEDCOM result with nodes and pointer map
 */
export async function parseGedcom(
  input: string | AsyncIterable<any> | ReadableStream,
  options: ParseOptions = {}
) {
  const parser = new Parser(options);
  for await (const raw of linesFrom(input)) parser.feed(String(raw));
  return parser.finish();
}

/**
 * Parses GEDCOM data from a string synchronously.
 * @param input - GEDCOM data as string
 * @param options - Parser options
 * @returns Parsed GEDCOM result with nodes and pointer map
 */
export function parseGedcomSync(input: string, options: ParseOptions = {}) {
  // Strip BOM if present
  let src = String(input);
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const parser = new Parser(options);
  const lines = src.split(/\n/);
  for (let i = 0; i < lines.length; i++) parser.feed(lines[i]);
  return parser.finish();
}
