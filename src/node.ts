import { GedcomValue } from "./decoder.js";

/**
 * Public API contract for the gedcom-parser library.
 *
 * This file contains only TypeScript types and function signatures used by
 * consumers. The declarations here describe the shapes produced by the parser
 * and the extension points (decoders, factories, registries) available to
 * callers.
 */
export type Tag = string;

/**
 * Core node representation returned by the parser. Nodes form a tree that
 * mirrors the hierarchical structure of a GEDCOM file.
 *
 * Field notes:
 * - id: optional pointer id for the record (top-level records commonly have ids)
 * - tag: the GEDCOM tag name for this node (always present)
 * - rawValue: the literal string parsed from the source for this node
 * - value: optional decoded/normalized value produced by a TagDecoder
 * - children: nested nodes (always an array; may be empty)
 * - parent: optional back-reference to the parent node (top-level nodes have undefined/null)
 * - meta: free-form bag for implementation-specific metadata (not interpreted by library)
 */
export interface GedcomNode {
  /** optional record id (pointer) such as "@I1@" */
  id?: string; // optional record id (pointer) like @I1@
  /** GEDCOM tag string (INDI, FAM, NAME, etc.) */
  tag: Tag; // GEDCOM tag (INDI, FAM, NAME, etc.)
  /** literal value text as parsed from the GEDCOM line (if present) */
  rawValue?: string; // literal value as parsed from the line
  /** decoded/normalized value produced by a decoder (dates, pointers, names, etc.) */
  value?: GedcomValue; // decoded/normalized value (dates, names, pointers, etc.)
  /** child nodes nested under this node */
  children: GedcomNode[];
  /** parent node, or null/undefined for root nodes */
  parent?: GedcomNode | null;
  /** implementation-specific metadata bag for storing parser/runtime info */
  meta?: Record<string, any>; // implementation-specific metadata
}

/**
 * BaseNode is the minimal implementation of GedcomNode.
 * Provides core properties and childrenReferences helper.
 */
export class BaseNode implements GedcomNode {
  id?: string | undefined;
  tag: string;
  rawValue?: string | undefined;
  value?: GedcomValue | undefined;
  children: GedcomNode[] = [];
  parent?: GedcomNode | null | undefined;
  meta?: Record<string, any> | undefined;

  constructor(
    tag: string,
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    this.tag = tag;
    this.rawValue = rawValue;
    this.parent = parent ?? null;
    this.meta = meta ?? {};
  }

  /**
   * Returns all child nodes of the given tag that have resolved references.
   */
  childrenReferences(tag: string): GedcomNode[] {
    return this.children
      .filter(
        (child) =>
          child.tag === tag &&
          child.value &&
          typeof child.value === "object" &&
          (child.value.ref as GedcomNode)
      )
      .map((child) => child.value.ref as GedcomNode);
  }
}

/**
 * IndividualNode represents an INDI record with convenience helpers.
 */
export class IndividualNode extends BaseNode {
  constructor(
    tag = "INDI",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  /**
   * Returns the display name (slashes removed) of the first NAME child, or undefined.
   */
  getName(): string | undefined {
    for (const c of this.children) {
      if (
        c.tag === "NAME" &&
        c.value &&
        typeof c.value === "object" &&
        "display" in c.value
      ) {
        return c.value.display;
      }
    }
    return undefined;
  }

  /**
   * Returns the parsed birth date as a Date object, or null if not available.
   */
  getBirthDate(): Date | null {
    const node = this.getBirthDateNode();
    if (!node) return null;
    return node.value?.parsed as Date;
  }

  /**
   * Returns the parsed death date as a Date object, or null if not available.
   */
  getDeathDate(): Date | null {
    const node = this.getDeathDateNode();
    if (!node) return null;
    return node.value?.parsed as Date;
  }

  /**
   * Returns family group nodes where this individual is listed as a spouse (FAMS).
   */
  getFamilyGroupsAsSpouse(): GedcomNode[] {
    return this.childrenReferences("FAMS");
  }

  /**
   * Returns family group nodes where this individual is listed as a child (FAMC).
   */
  getFamilyGroupsAsChild(): GedcomNode[] {
    return this.childrenReferences("FAMC");
  }

  /**
   * Returns the DATE node for birth, or null if not available.
   */
  getBirthDateNode() {
    const b = this.children.find((c) => c.tag === "BIRT");
    if (!b) return null;
    return b.children.find((c) => c.tag === "DATE") ?? null;
  }

  /**
   * Returns the DATE node for death, or null if not available.
   */
  getDeathDateNode() {
    const b = this.children.find((c) => c.tag === "DEAT");
    if (!b) return null;
    return b.children.find((c) => c.tag === "DATE") ?? null;
  }
}

/**
 * FamilyEventNode is an abstract class for family events (MARR, DIV, etc).
 * Provides helpers for TYPE and DATE child nodes.
 */
export abstract class FamilyEventNode extends BaseNode {
  /**
   * Returns the TYPE GedcomValue, if present.
   */
  getType(): GedcomValue | undefined {
    const typeNode = this.children.find((c) => c.tag === "TYPE");
    return typeNode?.value;
  }
  /**
   * Returns the DATE GedcomValue, if present.
   */
  getDate(): GedcomValue | undefined {
    const dateNode = this.children.find((c) => c.tag === "DATE");
    return dateNode?.value;
  }
}

/**
 * MarriageNode represents a MARR event.
 */
export class MarriageNode extends FamilyEventNode {
  constructor(
    tag = "MARR",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }
}

/**
 * DivorceNode represents a DIV event.
 */
export class DivorceNode extends FamilyEventNode {
  constructor(
    tag = "DIV",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }
}

/**
 * FamilyGroupNode represents a FAM record with spouse/children/event helpers.
 */
export class FamilyGroupNode extends BaseNode {
  constructor(
    tag = "FAM",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  /**
   * Returns the resolved husband node, or null if not available.
   */
  getHusband(): GedcomNode | null {
    return this.childrenReferences("HUSB")?.[0];
  }

  /**
   * Returns the resolved wife node, or null if not available.
   */
  getWife(): GedcomNode | null {
    return this.childrenReferences("WIFE")?.[0];
  }

  /**
   * Returns all resolved children nodes.
   */
  getChildren(): GedcomNode[] {
    return this.childrenReferences("CHIL");
  }

  /**
   * Returns the first MARR node, or null if not available.
   */
  getMarriageNode(): MarriageNode | null {
    const node = this.children.find((c) => c.tag === "MARR");
    return node ? (node as MarriageNode) : null;
  }

  /**
   * Returns the first DIV node, or null if not available.
   */
  getDivorceNode(): DivorceNode | null {
    const node = this.children.find((c) => c.tag === "DIV");
    return node ? (node as DivorceNode) : null;
  }

  /**
   * Returns the date value of the first MARR node, or undefined if not available.
   */
  getMarriageDate(): GedcomValue | undefined {
    const marr = this.getMarriageNode();
    return marr?.getDate();
  }

  /**
   * Returns the date value of the first DIV node, or undefined if not available.
   */
  getDivorceDate(): GedcomValue | undefined {
    const div = this.getDivorceNode();
    return div?.getDate();
  }
}

/**
 * PlaceNode represents a PLAC record with normalization helper.
 */
export class PlaceNode extends BaseNode {
  constructor(
    tag = "PLAC",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  /**
   * Returns the normalized place string.
   */
  getNormalized(): string {
    if (typeof this.value === "string") return this.value.trim();
    if (this.rawValue) return this.rawValue.trim();
    return "";
  }
}

/**
 * Factory function used to construct node instances. Consumers can provide a
 * custom NodeFactory to return richer classes (for example classes that
 * implement the helper interfaces above).
 */
export type NodeFactory = (
  tag: Tag,
  rawValue?: string,
  parent?: GedcomNode | null,
  meta?: Record<string, any>
) => GedcomNode;

/**
 * Creates the default node factory for constructing GEDCOM nodes.
 * @returns A NodeFactory function that produces default node instances.
 */
export function createDefaultNodeFactory(): NodeFactory {
  return (tag, rawValue, parent, meta) => {
    const t = (tag || "").toUpperCase();
    if (t === "INDI") return new IndividualNode(tag, rawValue, parent, meta);
    if (t === "FAM") return new FamilyGroupNode(tag, rawValue, parent, meta);
    if (t === "MARR") return new MarriageNode(tag, rawValue, parent, meta);
    if (t === "DIV") return new DivorceNode(tag, rawValue, parent, meta);
    if (t === "PLAC") return new PlaceNode(tag, rawValue, parent, meta);
    return new BaseNode(tag, rawValue, parent, meta);
  };
}
