# Purpose

A small TypeScript library to parse GEDCOM files and produce tree-like data structures for further consumption. The parser should preserve as much information as practical, including custom and future/undefined tags, while keeping the semantic meaning of the data.

The parser is not required to produce a verbatim reproduction of the original file. For example, `CONC`/`CONT` lines may be concatenated into a single string and superfluous whitespace may be normalized or discarded.

# Technical specification

- Language and packaging
  - Implemented in TypeScript and published for third-party use.
  - Build and packaging must support both ES modules and CommonJS consumers.

- Core model
  - Provide a `GedcomNode` (or similarly named) class that represents a single GEDCOM node. Each node should store its tag, raw value, parsed value(s) when applicable, attributes/metadata, and links to child nodes.
  - The core `GedcomNode` must avoid hard-coded semantic assumptions about tags so custom tags and variant specs remain supported.

- Decoding rules
  - Known tags should be decoded into appropriate types when useful (for example: dates for `BIRT`/`DEAT`, pointers for `HUSB`/`WIFE`/`CHIL`). Unknown tags should be retained as raw text and as structured children.
  - `CONC` and `CONT` continuations must be decoded and joined into a single logical string value.
  - Pointer values (IDs that reference other records) should be resolvable to other `GedcomNode` instances. Pointer resolution should be optional/configurable and performed after parsing when requested.
  - Whitespace and formatting may be normalized; the library should document what is preserved and what is lost compared to the original GEDCOM file.

- Extensibility
  - Decoding and node instantiation must be overridable. Provide an adapter/registry or factory API that allows callers to supply custom decoders for specific tags and to map tags to subclasses of `GedcomNode` when needed.
  - Example built-in subclasses: `Individual` (for `INDI`), `FamilyGroup` (for `FAM`), and `Place` (for `PLAC`). These classes should expose convenient helper methods (for example: `getNames()`, `getBirthDate()`, `getSpouses()`).

- API and behavior
  - Provide a simple parse function that accepts a stream or string and returns a root node or a collection of top-level nodes.
  - Offer an optional second step to resolve pointers and build cross-references.
  - Keep the runtime API small and well-typed so consumers can traverse, query, and serialize the parsed structure (for example to JSON) easily.

- Edge cases and error handling
  - Handle malformed lines gracefully: surface parse errors with line numbers and context rather than throwing opaque exceptions.
  - Support large files via streaming or incremental parsing to avoid excessive memory use.
  - Allow callers to choose strict or permissive parsing modes.

- Minimum deliverables
  - The library must include:
    - `GedcomNode` core type and basic subclasses (`Individual`, `FamilyGroup`, `Place`)
    - Tag-decoder extension points and a registry/factory for node instantiation
    - Helper utilities for common tasks (name extraction, date parsing, pointer resolution)
    - Clear README usage examples and minimal tests covering the happy path and a couple of edge cases