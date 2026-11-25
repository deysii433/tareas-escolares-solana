import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./config";
import { SEED_ALUMNO, SEED_GRUPO, SEED_TAREA } from "./seeds";

const texto = (s: string) => new TextEncoder().encode(s);

/** Grupo: ["grupo", profesor, nombre] */
export function pdaGrupo(profesor: PublicKey, nombre: string, programId = PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [texto(SEED_GRUPO), profesor.toBytes(), texto(nombre)],
    programId,
  )[0];
}

/** Alumno: ["alumno", grupo, nombre] */
export function pdaAlumno(grupo: PublicKey, nombre: string, programId = PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [texto(SEED_ALUMNO), grupo.toBytes(), texto(nombre)],
    programId,
  )[0];
}

/** Tarea: ["tarea", alumno, titulo] */
export function pdaTarea(alumno: PublicKey, titulo: string, programId = PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync(
    [texto(SEED_TAREA), alumno.toBytes(), texto(titulo)],
    programId,
  )[0];
}
