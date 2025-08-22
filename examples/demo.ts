import {
  parseGedcomSync,
  IndividualNode,
  FamilyGroupNode,
} from "../src/index.js";

const sample = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 12 APR 1900
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 1900
`;

function main() {
  const res = parseGedcomSync(sample, { resolvePointers: true });
  const indi = res.nodes.find((n) => n.tag === "INDI") as IndividualNode;
  const fam = res.nodes.find((n) => n.tag === "FAM") as FamilyGroupNode;

  parseGedcomSync("", { resolvePointers: true });
  console.log("Individual name:", indi.getName());
  console.log("Birth date:", indi.getBirthDate());
  console.log(
    "Family as spouse:",
    indi.getFamilyGroupsAsSpouse().map((f) => f.id)
  );
  console.log("Husband:", fam.getHusband()?.id);
  console.log("Marriage date:", fam.getMarriageDate()?.parsed);
  console.log(
    "Children:",
    fam.getChildren().map((c) => c.id)
  );
}

main();
