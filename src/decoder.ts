import {
  GedcomNode,
  GedcomValue,
  TagDecoder,
  NodeFactory,
  DecoderRegistry,
  DatePrecision,
} from "./api.js";

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
  const monthMap: Record<string, number> = {
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
  };
  let parsed: Date | undefined = undefined;
  let precision: DatePrecision | undefined = undefined;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^([0-9]{1,2}) ([A-Z]{3}) ([0-9]{4})$/))) {
    const day = parseInt(m[1], 10);
    const month = monthMap[m[2].toUpperCase()];
    const year = parseInt(m[3], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      parsed = new Date(year, month, day);
      precision = "day";
    }
  } else if ((m = text.match(/^([A-Z]{3}) ([0-9]{4})$/))) {
    const month = monthMap[m[1].toUpperCase()];
    const year = parseInt(m[2], 10);
    if (month !== undefined && !isNaN(year)) {
      parsed = new Date(year, month, 1);
      precision = "month";
    }
  } else if ((m = text.match(/^([0-9]{4})$/))) {
    const year = parseInt(m[1], 10);
    if (!isNaN(year)) {
      parsed = new Date(year, 0, 1);
      precision = "year";
    }
  }
  if (!parsed) {
    precision = undefined;
  }
  return {
    text,
    parsed,
    precision,
  };
};

const nameDecoder: TagDecoder = (node, rawValue) => {
  if (!rawValue) return undefined;
  const display = String(rawValue).replace(/\//g, "").trim();
  const m = String(rawValue).match(/\/(.*?)\//);
  const surname = m ? m[1] : undefined;
  return {
    display,
    surname,
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
