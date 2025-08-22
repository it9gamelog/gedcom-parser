import { GedcomNode, Tag } from "./node.js";

/**
 * GedcomValue is the canonical union of values produced by decoders.
 *
 * Typical runtime values:
 * - string: raw un-decoded values (default for most tags)
 * - GedcomDate: when the tag is a DATE or decoder returns a structured date
 * - GedcomPointer: when the tag points to another record (INDI/FAM references)
 * - any: custom decoder return values are permitted (the registry can
 *   provide structured objects specific to your application)
 */
export type GedcomValue = GedcomName | GedcomDate | GedcomPointer | any;

/**
 * Registry abstraction for decoders. Implementations should allow registering
 * decoders by tag and retrieving them during parsing.
 */
export interface DecoderRegistry {
  /** register a decoder for a specific GEDCOM tag */
  register(tag: Tag, decoder: TagDecoder): void;
  /** retrieve a decoder previously registered for `tag` */
  get(tag: Tag): TagDecoder | undefined;
}

/**
 * A TagDecoder is a function that receives a node and its raw parts and
 * returns a decoded value. The return type is intentionally permissive to
 * allow custom decoders to return any structured data they need.
 */
export type TagDecoder = (node: GedcomNode) => GedcomValue;

/**
 * GedcomName represents a parsed name structure from a GEDCOM file.
 */
export interface GedcomName {
  /** name string for display (e.g. "John Doe") */
  display: string;
  /** optional surname (e.g. "Doe") */
  surname?: string;
}

/**
 * Precision level for a parsed GEDCOM date.
 * - "year": only the year was parsed (e.g. "1925")
 * - "month": year+month were parsed (e.g. "MAR 1925")
 * - "day": full date with day (e.g. "12 MAR 1925")
 */
export type DatePrecision = "year" | "month" | "day";

/**
 * Structured representation of a decoded GEDCOM date value.
 */
export interface GedcomDate {
  /** original textual date from the GEDCOM file (unchanged) */
  text: string;
  /** optional Date object when parsing succeeded (may be undefined) */
  parsed?: Date;
  /** optional precision hint describing the granularity of `parsed` */
  precision?: DatePrecision;
}

/**
 * Represents a pointer/reference to another GEDCOM record.
 */
export interface GedcomPointer {
  /** pointer id string exactly as found in the GEDCOM source (e.g. "@I1@") */
  pointer: string; // pointer id like "@I1@"
  /** The resolved node after pointer resolution */
  ref?: GedcomNode; // optional resolved reference
}

/**
 * Simple implementation of the DecoderRegistry interface.
 */
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
const dateDecoder: TagDecoder = (node) => {
  if (!node.rawValue) return undefined;
  const text = String(node.rawValue).trim();
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

const nameDecoder: TagDecoder = (node) => {
  if (!node.rawValue) return undefined;
  const display = String(node.rawValue).replace(/\//g, "").trim();
  const m = String(node.rawValue).match(/\/(.*?)\//);
  const surname = m ? m[1] : undefined;
  return {
    display,
    surname,
  } as GedcomName;
};

/**
 * Creates a default decoder registry pre-populated with common GEDCOM decoders.
 * @returns A SimpleDecoderRegistry instance with default decoders registered.
 */
export function createDefaultRegistry(): DecoderRegistry {
  const r = new SimpleDecoderRegistry();
  r.register("DATE", dateDecoder);
  r.register("NAME", nameDecoder);
  return r;
}

// Walk tree and apply decoders
export function applyDecoders(nodes: GedcomNode[], registry: DecoderRegistry) {
  function walk(node: GedcomNode) {
    if (node.rawValue !== undefined) {
      const decoder = registry.get(node.tag);
      if (decoder) node.value = decoder(node);
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
