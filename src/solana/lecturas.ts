// LECTURAS: solo consultan el RPC, no piden firma ni cuestan SOL.
import { Connection, PublicKey, type GetProgramAccountsFilter } from "@solana/web3.js";
import bs58 from "bs58";
import {
  getAlumnoDecoder,
  getGrupoDecoder,
  getTareaDecoder,
  ALUMNO_DISCRIMINATOR,
  GRUPO_DISCRIMINATOR,
  TAREA_DISCRIMINATOR,
  type Alumno,
  type Grupo,
  type Tarea,
} from "../../clients/js/src/generated";
import { PROGRAM_ID } from "./config";

export type ConDireccion<T> = T & { direccion: PublicKey };

// Todas las cuentas empiezan con 8 bytes de discriminador; el primer campo
// (profesor / grupo / alumno) está en el offset 8. Así filtramos por "padre".
const filtros = (disc: ArrayLike<number>, padre: PublicKey): GetProgramAccountsFilter[] => [
  { memcmp: { offset: 0, bytes: bs58.encode(Uint8Array.from(disc)) } },
  { memcmp: { offset: 8, bytes: padre.toBase58() } },
];

async function leer<T>(
  connection: Connection,
  disc: ArrayLike<number>,
  padre: PublicKey,
  decodificar: (datos: Uint8Array) => T,
): Promise<ConDireccion<T>[]> {
  const cuentas = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: filtros(disc, padre),
  });
  return cuentas.map(({ pubkey, account }) => ({
    ...decodificar(Uint8Array.from(account.data)),
    direccion: pubkey,
  }));
}

export const leerGrupos = (c: Connection, profesor: PublicKey) =>
  leer<Grupo>(c, GRUPO_DISCRIMINATOR, profesor, (d) => getGrupoDecoder().decode(d)).then((l) =>
    l.sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

export const leerAlumnos = (c: Connection, grupo: PublicKey) =>
  leer<Alumno>(c, ALUMNO_DISCRIMINATOR, grupo, (d) => getAlumnoDecoder().decode(d)).then((l) =>
    l.sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

export const leerTareas = (c: Connection, alumno: PublicKey) =>
  leer<Tarea>(c, TAREA_DISCRIMINATOR, alumno, (d) => getTareaDecoder().decode(d)).then((l) =>
    l.sort((a, b) => a.titulo.localeCompare(b.titulo)),
  );
