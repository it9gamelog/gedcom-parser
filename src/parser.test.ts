import { describe, it, expect } from "vitest";
import { parseGedcomSync } from "./parser.js";
import { IndividualNode, FamilyGroupNode, BaseNode } from "./node.js";

const BOM = "\uFEFF";

describe("Parser test", () => {
  it("preserves whitespace for CONC and CONT", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "1 NOTE This is a note",
      "2 CONT  with leading space",
      "2 CONC and trailing space ",
      "2 CONT",
      "1 NOTE Another note",
      "2 CONT",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    const note = result.nodes[0].children.find((n) => n.tag === "NOTE");
    expect(note?.rawValue).toBe(
      "This is a note\n with leading spaceand trailing space \n"
    );
    const note2 = result.nodes[0].children.find(
      (n) => n.tag === "NOTE" && n !== note
    );
    expect(note2?.rawValue).toBe("Another note\n");
  });

  it("handles Windows line endings", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "1 NOTE Line1",
      "2 CONT Line2",
      "2 CONC Line3",
    ].join("\r\n");
    const result = parseGedcomSync(gedcom);
    const note = result.nodes[0].children.find((n) => n.tag === "NOTE");
    expect(note?.rawValue).toBe("Line1\nLine2Line3");
  });

  it("handles Unix line endings", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "1 NOTE Line1",
      "2 CONT Line2",
      "2 CONC Line3",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    const note = result.nodes[0].children.find((n) => n.tag === "NOTE");
    expect(note?.rawValue).toBe("Line1\nLine2Line3");
  });

  it("strips BOM at start of document", () => {
    const gedcom = BOM + "0 @I1@ INDI\n1 NAME John /Doe/";
    const result = parseGedcomSync(gedcom);
    expect(result.nodes[0].tag).toBe("INDI");
  });
});

describe("Parser pointer resolution and node helpers", () => {
  it("resolves family and individual links", async () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "1 FAMS @F1@",
      "1 FAMC @F2@",
      "0 @I3@ INDI",
      "1 NAME Son",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 WIFE @I2@",
      "1 CHIL @I3@",
      "0 @F2@ FAM",
      "1 CHIL @I1@",
      "1 CHIL @I4@",
      "1 HUSB @I5@",
      "1 WIFE @I6@",
    ].join("\n");
    const result = parseGedcomSync(gedcom, { resolvePointers: true });
    const indi = result.byId["@I1@"] as IndividualNode;
    expect(indi.getFamilyGroupsAsSpouse().length).toBe(1);
    expect(indi.getFamilyGroupsAsChild().length).toBe(1);
    const famAsSpouse = indi.getFamilyGroupsAsSpouse()[0] as FamilyGroupNode;
    expect(famAsSpouse.getHusband()).toBe(indi);
    expect(famAsSpouse.getChildren().length).toBe(1);
    expect(famAsSpouse.getChildren()[0].id).toBe("@I3@");
    const famAsChild = indi.getFamilyGroupsAsChild()[0] as FamilyGroupNode;
    expect(famAsChild.getChildren().map((c) => c.id)).toContain("@I1@");
  });
});

describe("Parser edge cases", () => {
  it("handles empty lines and unknown tags", () => {
    const gedcom = [
      "",
      "0 @I1@ INDI",
      "1 FOO somevalue",
      "1 NAME John /Doe/",
      "",
      "0 @F1@ FAM",
      "1 BAR",
      "1 HUSB @I1@",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    expect(result.nodes.length).toBe(2);
    expect(result.nodes[0].children.some((c) => c.tag === "FOO")).toBe(true);
    expect(result.nodes[1].children.some((c) => c.tag === "BAR")).toBe(true);
  });

  it("handles deeply nested records", () => {
    const gedcom = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "2 NEST1",
      "3 NEST2",
      "4 NEST3",
      "5 NEST4",
      "6 NEST5",
      "7 NEST6",
      "8 NEST7",
      "9 NEST8",
      "10 NEST9",
      "11 NEST10",
    ].join("\n");
    const result = parseGedcomSync(gedcom);
    let node = result.nodes[0];
    for (let i = 0; i < 11; i++) {
      expect(node.children.length).toBe(1);
      node = node.children[0];
    }
    expect(node.tag).toBe("NEST10");
  });
});
