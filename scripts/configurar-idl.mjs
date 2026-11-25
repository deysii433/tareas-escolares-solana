// Configura el IDL con el Program ID desplegado y regenera el cliente Codama.
//
// Opción A (la más simple): solo el Program ID, usando el idl.json del repo
//   npm run configurar:idl -- --program-id <PROGRAM_ID>
//
// Opción B: importar el IDL exportado de Solana Playground
//   npm run configurar:idl -- ./tmp-idl/tareas_escolares.json [--program-id <PROGRAM_ID>]
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const i = args.indexOf("--program-id");
const programId = i >= 0 ? args[i + 1] : undefined;
const ruta = args.find((a, k) => !a.startsWith("--") && (i < 0 || k !== i + 1));

const REQUERIDAS = [
  "crear_grupo", "agregar_alumno", "crear_tarea", "editar_tarea",
  "calificar_tarea", "eliminar_tarea", "eliminar_alumno", "eliminar_grupo",
];
const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

let idl = JSON.parse(readFileSync("idl.json", "utf8"));

if (ruta) {
  const nuevo = JSON.parse(readFileSync(ruta, "utf8"));
  const nombres = (nuevo.instructions ?? []).map((x) => snake(x.name));
  const faltan = REQUERIDAS.filter((n) => !nombres.includes(n));
  if (faltan.length) {
    console.error("❌ Ese IDL no corresponde a este proyecto. Faltan:", faltan.join(", "));
    process.exit(1);
  }
  const esLegacy = !nuevo.address || !(nuevo.instructions ?? []).every((x) => Array.isArray(x.discriminator));
  if (esLegacy) {
    // IDL anterior a Anchor 0.30: usamos el idl.json del repo (mismo programa) y solo tomamos la dirección.
    console.warn("⚠️  El IDL exportado usa el formato antiguo (pre Anchor 0.30). Se conserva idl.json y solo se actualiza el Program ID.");
    const dir = nuevo.address ?? nuevo.metadata?.address;
    if (dir) idl.address = dir;
  } else {
    idl = nuevo;
  }
}

if (programId) idl.address = programId;

if (!idl.address || idl.address === "11111111111111111111111111111111") {
  console.error("❌ Falta el Program ID. Usa: npm run configurar:idl -- --program-id <TU_PROGRAM_ID>");
  process.exit(1);
}
if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(idl.address)) {
  console.error("❌ El Program ID no parece válido:", idl.address);
  process.exit(1);
}

writeFileSync("idl.json", JSON.stringify(idl, null, 2) + "\n");
console.log("✅ idl.json actualizado. Program ID:", idl.address);
execSync("npm run cliente", { stdio: "inherit" });
