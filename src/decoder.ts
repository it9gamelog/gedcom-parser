import {
  GedcomNode,
  GedcomValue,
  TagDecoder,
  NodeFactory,
  DecoderRegistry,
} from "./api";

// Simple registry implementation
export class SimpleDecoderRegistry implements DecoderRegistry {
  private map = new Map<string, TagDecoder>();
  register(tag: string, decoder: TagDecoder): void {
    this.map.set(tag, decoder);
  }
  get(tag: string): TagDecoder | undefined {
    return this.map.get(tag);
  }
}

// Basic decoders
const dateDecoder: TagDecoder = (node, rawValue) => {
  if (!rawValue) return undefined;
  const text = String(rawValue).trim();
  // basic parsing; keep simple
  const parsed = ((): Date | undefined => {
    const iso = Date.parse(text);
    if (!isNaN(iso)) return new Date(iso);
    const parts = text.split(/\s+/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = (
        {
          JAN: 0,
          FEB: 1,
          MAR: 2,
          APR: 3,
          MAY: 4,
          JUN: 5,
          JUL: 6,
          AUG: 7,
          SEP: 8,
          OCT: 9,
          NOV: 10,
          DEC: 11,
        } as any
      )[parts[1].toUpperCase()];
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && m !== undefined && !isNaN(y)) return new Date(y, m, d);
    }
    if (parts.length === 2) {
      const m = (
        {
          JAN: 0,
          FEB: 1,
          MAR: 2,
          APR: 3,
          MAY: 4,
          JUN: 5,
          JUL: 6,
          AUG: 7,
          SEP: 8,
          OCT: 9,
          NOV: 10,
          DEC: 11,
        } as any
      )[parts[0].toUpperCase()];
      const y = parseInt(parts[1], 10);
      if (m !== undefined && !isNaN(y)) return new Date(y, m, 1);
    }
    return undefined;
  })();
  return {
    text,
    parsed: parsed || undefined,
    circa: /ABT|CIR|ABOUT/i.test(text),
    range: undefined,
  } as GedcomValue;
};

const nameDecoder: TagDecoder = (node, rawValue) => {
  if (!rawValue) return undefined;
  const full = String(rawValue);
  const m = full.match(/\/(.*?)\//);
  const surname = m ? m[1] : undefined;
  return {
    full,
    surname,
    normalized: full.replace(/\s+/g, " ").trim(),
  } as GedcomValue;
};

// Factory to create a fresh registry pre-populated with default decoders.
export function createDefaultRegistry(): SimpleDecoderRegistry {
  const r = new SimpleDecoderRegistry();
  r.register("DATE", dateDecoder);
  r.register("NAME", nameDecoder);
  r.register("GIVN", nameDecoder);
  r.register("SURN", nameDecoder);
  return r;
}

// Walk tree and apply decoders
export function applyDecoders(nodes: GedcomNode[], registry: DecoderRegistry) {
  function walk(node: GedcomNode) {
    if (node.rawValue !== undefined) {
      const decoder = registry.get(node.tag);
      if (decoder) node.value = decoder(node, node.rawValue, node.children);
      else {
        const pv = String(node.rawValue);
        if (/^@.+@$/.test(pv.trim()))
          node.value = { pointer: pv, ref: undefined } as GedcomValue;
        else node.value = pv;
      }
    }
    for (const c of node.children) walk(c);
  }

  for (const n of nodes) walk(n);
}
