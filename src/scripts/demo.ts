import parser from "../parser";

const sample = `0 @I1@ INDI
1 NAME John /Doe/
1 BIRT
2 DATE 12 APR 1900
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
`;

(async function main() {
  const res = await parser.parseGedcom(sample, { resolvePointers: true });
  console.log("Parsed nodes:", res.nodes.length);
  console.dir(res.nodes, { depth: 8 });
})();
