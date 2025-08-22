import {
  parseGedcomSync,
  IndividualNode,
  FamilyGroupNode,
} from "../src/index.js";

const sample = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 12 APR 1900
1 FAMS @F1@
0 @I2@ INDI
1 NAME Jane /Doe/
1 FAMS @F1@
0 @I3@ INDI
1 NAME Johnny /Doe/
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 1925
`;

function main() {
  const res = parseGedcomSync(sample, { resolvePointers: true });
  const indi = res.nodes.find((n) => n.tag === "INDI") as IndividualNode;
  const fam = res.byId["@F1@"] as FamilyGroupNode;

  console.log(`Individual name: ${indi.getName()}
Birth date: ${indi.getBirthDate()}
Family as spouse: ${indi
    .getFamilyGroupsAsSpouse()
    .map((f) => f.id)
    .join(", ")}
Husband: ${fam.getHusband()?.id}
Marriage date: ${fam.getMarriageDate()?.parsed}
Children: ${fam
    .getChildren()
    .map((c) => c.id)
    .join(", ")}`);
}

main();
