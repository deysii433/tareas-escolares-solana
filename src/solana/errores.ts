import idl from "../../idl.json";

type ErrorIdl = { code: number; name: string; msg?: string };
const ERRORES = (idl.errors ?? []) as ErrorIdl[];

/** Mensajes de errores comunes de Anchor (constraints). */
const ANCHOR: Record<number, string> = {
  2001: "Solo el profesor del grupo puede hacer esta operación",
  2003: "La cuenta no corresponde (has_one)",
  2006: "La dirección PDA no coincide con las seeds",
  3012: "La cuenta no existe todavía",
};

/** Convierte cualquier error (wallet, RPC, programa) en un mensaje legible en español. */
export function traducirError(e: unknown): string {
  const texto = e instanceof Error ? `${e.message} ${JSON.stringify((e as { logs?: unknown }).logs ?? "")}` : String(e);

  if (/User rejected|rejected the request/i.test(texto)) return "Cancelaste la firma en la wallet.";
  if (/already in use/i.test(texto)) return "Ya existe una cuenta con ese nombre/título.";
  if (/insufficient (funds|lamports)|0x1\b/i.test(texto))
    return "No tienes SOL suficiente en Devnet. Pide un airdrop en faucet.solana.com.";

  const hex = texto.match(/custom program error: 0x([0-9a-f]+)/i);
  const dec = texto.match(/Error Number: (\d+)/);
  const codigo = hex ? parseInt(hex[1], 16) : dec ? Number(dec[1]) : undefined;
  if (codigo !== undefined) {
    const propio = ERRORES.find((x) => x.code === codigo);
    if (propio) return propio.msg ?? propio.name;
    if (ANCHOR[codigo]) return ANCHOR[codigo];
    return `Error del programa (código ${codigo})`;
  }
  return texto.length > 200 ? texto.slice(0, 200) + "…" : texto;
}
