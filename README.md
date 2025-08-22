# Name

gedcom-parser - a TypeScript library that parse GEDCOM into tree-like objects.

# Synopsis

```javascript
import { parseGedcomSync, IndividualNode } from "@it9gamelog/gedcom-parser";

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
const res = parseGedcomSync(sample);
const indi = res.nodes.find((n) => n.tag === "INDI") as IndividualNode;
indi.getName() // "John Doe"
indi.getBirthDate() // 1900-04-12
indi.getFamilyGroupsAsSpouse()[0].getMarriageDate()?.parsed // 1925-01-01
fam.getChildren().map((c) => c.id).join(", ") // "@I3"
```

# Description

This repository provides a parser and a small object-model for GEDCOM files. It
focuses on a pluggable decoder system and a NodeFactory so consumers can get
rich node instances (individuals, family groups, places) and optionally resolve
pointers.

Notable features:

- Streaming and synchronous parsing entrypoints
- NodeFactory to return rich node classes (IndividualNode, FamilyGroupNode, PlaceNode),
  instead of plain JSON.
- Decoder registry for custom tag decoding (DATE, NAME, etc.)
- Optional pointer resolution to link references (e.g. `@I1@` -> resolved node)

## Comparison to other JSON based GEDCOM parser

Many other GEDCOM parsers convert files into a simplified JSON representation.
During that transformation they often normalize or drop tags that aren't
explicitly supported by their schema or transform, which can hide information
that some consumers need. They also tend to return plain JSON without
higher-level helpers for common tasks.

By contrast, this `gedcom-parser` preserves the original node tree and is
designed for extensibility: you can register node parsers and value decoders
for additional or custom GEDCOM tags so that unknown tags remain available and
can be decoded according to your needs.

In short: choose this library when you need streaming parsing, pointer
resolution, and a pluggable decoding model that keeps data accessible and easy
to consume.

# Usage (API)

The library exposes two primary parsing entrypoints:

- `parseGedcomSync(input, options)` — parse a complete string synchronously and
  return a `ParseResult`.
- `parseGedcom(streamOrAsyncIterable, options)` — parse from a ReadableStream or
  async iterable and return a `Promise<ParseResult>`.

The parser returns `ParseResult` containing:

- `nodes`: top-level `GedcomNode[]` (records)
- `byId`: map of pointer id (`@I1@`) → `GedcomNode`
- `resolvePointers?()`: optional helper to perform pointer resolution

Gedcom nodes follow the `GedcomNode` shape and decoders may set typed
`value` fields such as `GedcomDate` or `GedcomPointer`. The project includes
rich node classes you can obtain by supplying the default `NodeFactory`:

- `IndividualNode` — helper methods like `getName()`, `getBirthDate()`
- `FamilyGroupNode` — `getHusband()`, `getWife()`, `getChildren()`, `getMarriageDate()`
- `PlaceNode` — `getNormalized()`

# Extending

- Provide a custom `NodeFactory` when calling the parser to return app-specific
  node classes.
- Provide a custom `DecoderRegistry` map to handle custom tags.

# Examples

See `examples` directory.

# Contributing

- Open issues for bugs and feature requests.
- Add unit tests for new behaviors.

## Tests

Run unit tests with Vitest (project already configures tests):

```bash
yarn test
```
