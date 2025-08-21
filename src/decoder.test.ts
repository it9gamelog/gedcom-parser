import { describe, it, expect } from "vitest";
import { parseGedcomSync } from "./parser";
import { IndividualNode, FamilyGroupNode, BaseNode } from "./node";

describe("Decoder cases", () => {
  it("decodes date", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE 12 APR 1900"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed instanceof Date).toBe(true);
    const p = dateNode?.value?.parsed as Date;
    expect(p.getFullYear()).toBe(1900);
    expect(p.getMonth()).toBe(3);
    expect(p.getDate()).toBe(12);
  });
});
