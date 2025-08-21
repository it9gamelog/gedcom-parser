// Public API contract for the gedcom-parser library.
// This file contains TypeScript interfaces and function signatures only.

export type Tag = string;

// Structured types for common Gedcom values
export interface GedcomName {
  // Original/full value as found in the file, e.g. "Smith, John /Jr/"
  full: string;
  // Parsed components when available
  given?: string[]; // given names (in order)
  surname?: string; // family name
  prefix?: string; // name prefix (Dr., Rev., etc.)
  suffix?: string; // name suffix (Jr., III, etc.)
  romanized?: string; // romanized transcription, if present
  normalized?: string; // a normalized representation for searching
}

export type DatePrecision = "year" | "month" | "day";
export interface GedcomDate {
  text: string;
  parsed?: Date;
  precision?: DatePrecision;
}

export interface GedcomPointer {
  pointer: string; // pointer id like "@I1@"
  ref?: GedcomNode; // optional resolved reference
}

export type GedcomValue =
  | string
  | GedcomName
  | GedcomDate
  | GedcomPointer
  | any;

// A parsed line from the GEDCOM source (intermediate representation)
export interface RawGedcomLine {
  level: number;
  pointer?: string; // e.g. @I1@
  tag?: Tag;
  value?: string;
  raw: string; // original line text
}

// Core node representation
export interface GedcomNode {
  id?: string; // optional record id (pointer) like @I1@
  tag: Tag; // GEDCOM tag (INDI, FAM, NAME, etc.)
  rawValue?: string; // literal value as parsed from the line
  value?: GedcomValue; // decoded/normalized value (dates, names, pointers, etc.)
  children: GedcomNode[];
  parent?: GedcomNode | null;
  meta?: Record<string, any>; // implementation-specific metadata
}

// Subclass-like helper interfaces for common record types
export interface Individual extends GedcomNode {
  tag: "INDI" | string;
  getNames(): string[] | GedcomName[];
  getBirthDate(): GedcomDate | null;
  getDeathDate(): GedcomDate | null;
}

export interface FamilyGroup extends GedcomNode {
  tag: "FAM" | string;
  getHusbandId(): string | null;
  getWifeId(): string | null;
  getChildrenIds(): string[];
}

export interface Place extends GedcomNode {
  tag: "PLAC" | string;
  getNormalized(): string; // canonical place string
}

// Decoder API: convert raw node data into decoded value(s)
export type TagDecoder = (
  node: GedcomNode,
  rawValue?: string,
  children?: GedcomNode[]
) => any;

// Factory for creating node instances (allows overriding classes per tag)
export type NodeFactory = (
  tag: Tag,
  rawValue?: string,
  parent?: GedcomNode | null,
  meta?: Record<string, any>
) => GedcomNode;

export interface DecoderRegistry {
  register(tag: Tag, decoder: TagDecoder): void;
  get(tag: Tag): TagDecoder | undefined;
}

// Parse options
export interface ParseOptions {
  strict?: boolean; // strict vs permissive parsing
  normalizeWhitespace?: boolean; // whether to collapse/trim whitespace
  resolvePointers?: boolean; // whether to automatically resolve pointers after parse (default: yes)
  nodeFactory?: NodeFactory; // override node construction
  decoders?: Record<string, TagDecoder> | DecoderRegistry; // user-supplied decoders
  registry?: DecoderRegistry; // optional decoder registry
}

// Result of parse
export interface ParseResult {
  nodes: GedcomNode[]; // top-level nodes (e.g. multiple records)
  byId: Record<string, GedcomNode>; // optional index of nodes by pointer id
  registry?: DecoderRegistry;
  // Optional helper to resolve cross-references after parsing (if not done automatically)
  resolvePointers?: (options?: { timeoutMs?: number }) => Promise<void>;
}

// Primary parse function (string input). Implementations may also offer stream-based variants.
export function parseGedcom(input: string, options?: ParseOptions): ParseResult;
export function parseGedcom(
  input: AsyncIterable<any> | ReadableStream,
  options?: ParseOptions
): Promise<ParseResult>;
export function parseGedcom(input: any, options?: ParseOptions): any {
  // Implementation provided in src/parser.ts
  throw new Error("Not implemented");
}

// Synchronous convenience parse for small inputs (optional)
export function parseGedcomSync(
  input: string,
  options?: ParseOptions
): ParseResult {
  throw new Error("Not implemented");
}

// Pointer resolution helper - given a parse result, resolve pointer references in-place
export function resolvePointers(
  result: ParseResult,
  options?: { timeoutMs?: number }
): Promise<void> {
  return Promise.reject(new Error("Not implemented"));
}

// Utility exports for common node classes (constructors are optional and may be provided by implementations)
export default {
  parseGedcom,
  parseGedcomSync,
  resolvePointers,
};
