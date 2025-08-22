import { parseGedcom, IndividualNode, FamilyGroupNode } from "../src/index.js";

async function fetchAndParseGedcom(url: string) {
  const response = await fetch(url);
  if (!response.body) throw new Error("No ReadableStream available");
  const result = await parseGedcom(response.body, { resolvePointers: true });
  const fam = result.nodes.find((n) => n.tag === "FAM") as FamilyGroupNode;
  console.log("Husband:", fam.getHusband()?.id);
  console.log("Marriage date:", fam.getMarriageDate()?.parsed);
}

// Example usage (replace with a real GEDCOM file URL)
// fetchAndParseGedcom("/path/to/gedcom/file.ged");
