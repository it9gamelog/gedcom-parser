import { describe, it, expect } from "vitest";
import { parseGedcomSync } from "./parser";
import { IndividualNode, FamilyGroupNode, PlaceNode } from "./node";

describe("IndividualNode helpers", () => {
  it("getName returns display property of first NAME child", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "1 NAME Jane /Smith/",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    expect(indi.getName()).toBe("John Doe");
  });

  it("getBirthDateNode returns BIRT > DATE node", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 DATE 12 MAR 1925"].join("\n");
    const result = parseGedcomSync(gedcom);
    const indi = result.nodes[0] as IndividualNode;
    const dateNode = indi.getBirthDateNode();
    expect(dateNode?.tag).toBe("DATE");
    expect(dateNode?.rawValue).toBe("12 MAR 1925");
  });
});

describe("FamilyGroupNode helpers", () => {
  it("getHusband returns HUSB GedcomNode with correct pointer value", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    const fam = result.nodes.find((n) => n.tag === "FAM") as FamilyGroupNode;
    const husbandNode = fam.getHusband();
    expect(husbandNode?.id).toBe("@I1@");
  });

  it("getChildren returns all CHIL GedcomNodes with correct pointer values", () => {
    const gedcom = [
      "0 @I2@ INDI",
      "1 NAME Child1 /Doe/",
      "0 @I3@ INDI",
      "1 NAME Child2 /Doe/",
      "0 @F1@ FAM",
      "1 CHIL @I2@",
      "1 CHIL @I3@",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    const fam = result.nodes.find((n) => n.tag === "FAM") as FamilyGroupNode;
    const childrenNodes = fam.getChildren();
    const ids = childrenNodes.map((n) => n.id);
    expect(ids).toEqual(["@I2@", "@I3@"]);
  });
});

describe("PlaceNode helpers", () => {
  it("getNormalized returns normalized place string", () => {
    const gedcom = ["0 @I1@ INDI", "1 BIRT", "2 PLAC New York, USA"].join("\n");
    const result = parseGedcomSync(gedcom);
    // Find the PLAC node
    const indi = result.nodes[0] as IndividualNode;
    const birthNode = indi.children.find((n) => n.tag === "BIRT");
    const placeNode = birthNode?.children.find(
      (n) => n.tag === "PLAC"
    ) as PlaceNode;
    expect(placeNode.getNormalized()).toBe("New York, USA");
  });
});
