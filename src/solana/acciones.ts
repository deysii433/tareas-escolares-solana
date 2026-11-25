// OPERACIONES FIRMADAS: construyen instrucciones con el cliente Codama
// y las envían con la wallet (ver tx.ts).
import { PublicKey } from "@solana/web3.js";
import { address, createNoopSigner } from "@solana/kit";
import {
  getAgregarAlumnoInstruction,
  getCalificarTareaInstruction,
  getCrearGrupoInstruction,
  getCrearTareaInstruction,
  getEditarTareaInstruction,
  getEliminarAlumnoInstruction,
  getEliminarGrupoInstruction,
  getEliminarTareaInstruction,
} from "../../clients/js/src/generated";
import { PROGRAM_ID_TEXTO } from "./config";
import { pdaAlumno, pdaGrupo, pdaTarea } from "./pdas";
import type { InstruccionKit } from "./tx";
import {
  validarCalificacion,
  validarDescripcion,
  validarNombre,
} from "./validaciones";

const cfg = { programAddress: address(PROGRAM_ID_TEXTO) };
const a = (pk: PublicKey) => address(pk.toBase58());
// La wallet firma después; aquí solo marcamos al profesor como firmante.
const firmante = (pk: PublicKey) => createNoopSigner(a(pk));

function comprobar(...errores: (string | null)[]) {
  const e = errores.find(Boolean);
  if (e) throw new Error(e);
}

// ---------- GRUPO ----------

export function ixCrearGrupo(profesor: PublicKey, nombre: string): InstruccionKit {
  comprobar(validarNombre(nombre, "El nombre del grupo"));
  return getCrearGrupoInstruction(
    { profesor: firmante(profesor), grupo: a(pdaGrupo(profesor, nombre)), nombre },
    cfg,
  );
}

export function ixEliminarGrupo(profesor: PublicKey, grupo: PublicKey): InstruccionKit {
  return getEliminarGrupoInstruction({ profesor: firmante(profesor), grupo: a(grupo) }, cfg);
}

// ---------- ALUMNO ----------

export function ixAgregarAlumno(profesor: PublicKey, grupo: PublicKey, nombre: string): InstruccionKit {
  comprobar(validarNombre(nombre, "El nombre del alumno"));
  return getAgregarAlumnoInstruction(
    {
      profesor: firmante(profesor),
      grupo: a(grupo),
      alumno: a(pdaAlumno(grupo, nombre)),
      nombre,
    },
    cfg,
  );
}

export function ixEliminarAlumno(profesor: PublicKey, grupo: PublicKey, alumno: PublicKey): InstruccionKit {
  return getEliminarAlumnoInstruction(
    { profesor: firmante(profesor), grupo: a(grupo), alumno: a(alumno) },
    cfg,
  );
}

// ---------- TAREA ----------

export function ixCrearTarea(
  profesor: PublicKey,
  grupo: PublicKey,
  alumno: PublicKey,
  titulo: string,
  descripcion: string,
): InstruccionKit {
  comprobar(validarNombre(titulo, "El título"), validarDescripcion(descripcion));
  return getCrearTareaInstruction(
    {
      profesor: firmante(profesor),
      grupo: a(grupo),
      alumno: a(alumno),
      tarea: a(pdaTarea(alumno, titulo)),
      titulo,
      descripcion,
    },
    cfg,
  );
}

export function ixEditarTarea(
  profesor: PublicKey,
  grupo: PublicKey,
  alumno: PublicKey,
  tarea: PublicKey,
  descripcion: string,
): InstruccionKit {
  comprobar(validarDescripcion(descripcion));
  return getEditarTareaInstruction(
    { profesor: firmante(profesor), grupo: a(grupo), alumno: a(alumno), tarea: a(tarea), descripcion },
    cfg,
  );
}

export function ixCalificarTarea(
  profesor: PublicKey,
  grupo: PublicKey,
  alumno: PublicKey,
  tarea: PublicKey,
  calificacion: number,
): InstruccionKit {
  comprobar(validarCalificacion(calificacion));
  return getCalificarTareaInstruction(
    { profesor: firmante(profesor), grupo: a(grupo), alumno: a(alumno), tarea: a(tarea), calificacion },
    cfg,
  );
}

export function ixEliminarTarea(
  profesor: PublicKey,
  grupo: PublicKey,
  alumno: PublicKey,
  tarea: PublicKey,
): InstruccionKit {
  return getEliminarTareaInstruction(
    { profesor: firmante(profesor), grupo: a(grupo), alumno: a(alumno), tarea: a(tarea) },
    cfg,
  );
}
