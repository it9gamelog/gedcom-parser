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

  it("decodes name and surname", () => {
    const gedcom = ["0 @I1@ INDI", "1 NAME John /Doe/"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const nameNode = indi.children.find((n) => n.tag === "NAME");
    expect(nameNode?.value?.display).toBe("John Doe");
    expect(nameNode?.value?.surname).toBe("Doe");
  });

  it("decodes pointer value", () => {
    const gedcom = ["0 @F1@ FAM", "1 HUSB @I1@"].join("\n");
    const result = parseGedcomSync(gedcom);
    const fam = result.nodes[0] as FamilyGroupNode;
    const husbNode = fam.children.find((n) => n.tag === "HUSB");
    expect(typeof husbNode?.value).toBe("object");
    expect(husbNode?.value.pointer).toBe("@I1@");
  });

  it("handles edge case: empty name", () => {
    const gedcom = ["0 @I1@ INDI", "1 NAME "].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const nameNode = indi.children.find((n) => n.tag === "NAME");
    expect(nameNode?.value).toBeUndefined();
  });

  it("decodes full date: 12 MAR 1925", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE 12 MAR 1925"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed instanceof Date).toBe(true);
    expect(dateNode?.value?.parsed?.getFullYear()).toBe(1925);
    expect(dateNode?.value?.parsed?.getMonth()).toBe(2);
    expect(dateNode?.value?.parsed?.getDate()).toBe(12);
    expect(dateNode?.value?.precision).toBe("day");
  });

  it("decodes month/year: MAR 1925", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE MAR 1925"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed instanceof Date).toBe(true);
    expect(dateNode?.value?.parsed?.getFullYear()).toBe(1925);
    expect(dateNode?.value?.parsed?.getMonth()).toBe(2);
    expect(dateNode?.value?.parsed?.getDate()).toBe(1);
    expect(dateNode?.value?.precision).toBe("month");
  });

  it("decodes year only: 1925", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE 1925"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed instanceof Date).toBe(true);
    expect(dateNode?.value?.parsed?.getFullYear()).toBe(1925);
    expect(dateNode?.value?.parsed?.getMonth()).toBe(0);
    expect(dateNode?.value?.parsed?.getDate()).toBe(1);
    expect(dateNode?.value?.precision).toBe("year");
  });

  it("does not parse fuzzy date: ABT 1925", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE ABT 1925"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed).toBeUndefined();
    expect(dateNode?.value?.year).toBeUndefined();
    expect(dateNode?.value?.month).toBeUndefined();
    expect(dateNode?.value?.day).toBeUndefined();
    expect(dateNode?.value?.precision).toBeUndefined();
  });

  it("does not parse incomplete date: 12 MAR", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE 12 MAR"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.value?.parsed).toBeUndefined();
    expect(dateNode?.value?.year).toBeUndefined();
    expect(dateNode?.value?.month).toBeUndefined();
    expect(dateNode?.value?.day).toBeUndefined();
    expect(dateNode?.value?.precision).toBeUndefined();
  });
});
