import { LIMITES } from "./config";

const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Devuelve un mensaje de error o null si el texto es válido. Misma regla que el programa. */
export function validarNombre(valor: string, campo = "El nombre"): string | null {
  if (!valor.trim()) return `${campo} no puede estar vacío`;
  if (bytes(valor) > LIMITES.nombre) return `${campo} supera los ${LIMITES.nombre} bytes`;
  return null;
}

export function validarDescripcion(valor: string): string | null {
  if (bytes(valor) > LIMITES.descripcion)
    return `La descripción supera los ${LIMITES.descripcion} bytes`;
  return null;
}

export function validarCalificacion(valor: number): string | null {
  if (!Number.isInteger(valor) || valor < 0 || valor > LIMITES.calificacion)
    return `La calificación debe ser un entero entre 0 y ${LIMITES.calificacion}`;
  return null;
}
