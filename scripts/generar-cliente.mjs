// Genera el cliente TypeScript (Codama) a partir de idl.json
// Uso: npm run cliente
import { readFileSync } from "node:fs";
import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";

const idl = JSON.parse(readFileSync(new URL("../idl.json", import.meta.url), "utf8"));
const codama = createFromRoot(rootNodeFromAnchor(idl));
await codama.accept(renderVisitor("clients/js", { deleteFolderBeforeRendering: true }));
console.log("Cliente generado en clients/js/src/generated (programa:", idl.address + ")");
