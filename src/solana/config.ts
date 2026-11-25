import { PublicKey } from "@solana/web3.js";
import idl from "../../idl.json";

/** Program ID tomado del IDL (se actualiza con `npm run configurar:idl`). */
export const PROGRAM_ID_TEXTO: string = idl.address;
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_TEXTO);

/** true mientras el IDL todavía tenga la dirección de ejemplo (no desplegado). */
export const PROGRAMA_SIN_CONFIGURAR =
  PROGRAM_ID_TEXTO === "11111111111111111111111111111111";

export const RPC_URL: string =
  (import.meta.env.VITE_RPC_URL as string | undefined) || "https://api.devnet.solana.com";

export const EXPLORER = (firma: string) =>
  `https://explorer.solana.com/tx/${firma}?cluster=devnet`;

export const EXPLORER_CUENTA = (direccion: string) =>
  `https://explorer.solana.com/address/${direccion}?cluster=devnet`;

/** Límites que también valida el programa en Rust. */
export const LIMITES = {
  nombre: 32,
  descripcion: 200,
  calificacion: 100,
} as const;
