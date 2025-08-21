import {
  GedcomNode,
  GedcomValue,
  TagDecoder,
  NodeFactory,
  DecoderRegistry,
} from "./api.js";

// Resolve pointers across a parse result
export async function resolvePointers(
  result: { nodes: GedcomNode[]; byId: Record<string, GedcomNode> },
  options?: any
) {
  for (const id in result.byId) {
    const node = result.byId[id];
    const stack: GedcomNode[] = [node];
    while (stack.length) {
      const n = stack.pop()!;
      // if value contains pointer reference, resolve
      if (
        n &&
        n.value &&
        typeof n.value === "object" &&
        (n.value as any).pointer
      ) {
        const ptr = (n.value as any).pointer as string;
        const ref = result.byId[ptr];
        if (ref) (n.value as any).ref = ref;
      }
      // also check rawValue if value not present
      if (
        n &&
        (n.value === undefined || (n.value && !(n.value as any).pointer)) &&
        n.rawValue
      ) {
        const pv = String(n.rawValue).trim();
        if (/^@.+@$/.test(pv)) {
          const ref = result.byId[pv];
          if (ref) {
            n.value = { pointer: pv, ref } as GedcomValue;
          }
        }
      }
      if (n && n.children) for (const c of n.children) stack.push(c);
    }
  }
}
