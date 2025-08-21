import { GedcomNode, GedcomValue } from "./api";

// Minimal base implementation of GedcomNode
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

// Individual record with convenience helpers
export class IndividualNode extends BaseNode {
  constructor(
    tag = "INDI",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  getNames(): Array<string | GedcomValue> {
    const out: Array<string | GedcomValue> = [];
    for (const c of this.children) {
      if (c.tag === "NAME")
        out.push(c.value !== undefined ? c.value : c.rawValue ?? "");
    }
    return out;
  }

  getBirthDate(): Date | null {
    const node = this.getBirthDateNode();
    if (!node) return null;
    return node.value?.parsed as Date;
  }

  getDeathDate(): Date | null {
    const node = this.getDeathDateNode();
    if (!node) return null;
    return node.value?.parsed as Date;
  }

  // Return family group nodes where this individual is listed as a spouse (FAMS)
  getFamilyGroupsAsSpouse(): GedcomNode[] {
    return this.childrenReferences("FAMS");
  }

  // Return family group nodes where this individual is listed as a child (FAMC)
  getFamilyGroupsAsChild(): GedcomNode[] {
    return this.childrenReferences("FAMC");
  }

  // New: return the DATE node itself (raw node) for callers who want the node
  getBirthDateNode() {
    const b = this.children.find((c) => c.tag === "BIRT");
    if (!b) return null;
    return b.children.find((c) => c.tag === "DATE") ?? null;
  }

  getDeathDateNode() {
    const b = this.children.find((c) => c.tag === "DEAT");
    if (!b) return null;
    return b.children.find((c) => c.tag === "DATE") ?? null;
  }
}

// Family group with helpers for spouse/children pointers
export class FamilyGroupNode extends BaseNode {
  constructor(
    tag = "FAM",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  getHusband(): GedcomNode | null {
    return this.childrenReferences("HUSB")?.[0];
  }

  getWife(): GedcomNode | null {
    return this.childrenReferences("WIFE")?.[0];
  }

  getChildren(): GedcomNode[] {
    return this.childrenReferences("CHIL");
  }
}

export class PlaceNode extends BaseNode {
  constructor(
    tag = "PLAC",
    rawValue?: string,
    parent?: GedcomNode | null,
    meta?: Record<string, any>
  ) {
    super(tag, rawValue, parent, meta);
  }

  getNormalized(): string {
    if (typeof this.value === "string") return this.value.trim();
    if (this.rawValue) return this.rawValue.trim();
    return "";
  }
}

// Default node factory that returns rich node classes for well-known tags.
export const DefaultNodeFactory = (
  tag: string,
  rawValue?: string,
  parent?: GedcomNode | null,
  meta?: Record<string, any>
): GedcomNode => {
  const t = (tag || "").toUpperCase();
  if (t === "INDI") return new IndividualNode(tag, rawValue, parent, meta);
  if (t === "FAM") return new FamilyGroupNode(tag, rawValue, parent, meta);
  if (t === "PLAC") return new PlaceNode(tag, rawValue, parent, meta);
  return new BaseNode(tag, rawValue, parent, meta);
};

export default {
  BaseNode,
  IndividualNode,
  FamilyGroupNode,
  PlaceNode,
  DefaultNodeFactory,
};
