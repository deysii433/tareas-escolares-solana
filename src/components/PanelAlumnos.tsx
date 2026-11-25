import { useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import type { Alumno, Grupo } from "../../clients/js/src/generated";
import { INTERFAZ } from "../config/interfaz";
import { ixAgregarAlumno, ixEliminarAlumno } from "../solana/acciones";
import type { ConDireccion } from "../solana/lecturas";
import type { useOperacion } from "../useOperacion";

type Props = {
  profesor: PublicKey;
  grupo: ConDireccion<Grupo> | null;
  alumnos: ConDireccion<Alumno>[];
  seleccionado: string | null;
  seleccionar: (direccion: string | null) => void;
  op: ReturnType<typeof useOperacion>;
};

export function PanelAlumnos({ profesor, grupo, alumnos, seleccionado, seleccionar, op }: Props) {
  const [nombre, setNombre] = useState("");

  if (!grupo)
    return (
      <section className="panel">
        <h2>2 · Alumnos</h2>
        <p className="vacio">Selecciona un grupo.</p>
      </section>
    );

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (await op.ejecutar(`Agregar alumno "${n}"`, () => ixAgregarAlumno(profesor, grupo.direccion, n)))
      setNombre("");
  };

  return (
    <section className="panel">
      <h2>2 · Alumnos de {grupo.nombre}</h2>
      <form onSubmit={agregar} className="formulario">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={`Ej. ${INTERFAZ.ejemplos.alumno}`}
          maxLength={32}
        />
        <button disabled={op.ocupado || !nombre.trim()}>Agregar</button>
      </form>

      {alumnos.length === 0 ? (
        <p className="vacio">Este grupo no tiene alumnos.</p>
      ) : (
        <ul className="lista">
          {alumnos.map((a) => {
            const d = a.direccion.toBase58();
            return (
              <li key={d} className={d === seleccionado ? "activo" : ""} onClick={() => seleccionar(d)}>
                <div>
                  <b>{a.nombre}</b>
                  <small>
                    {a.totalTareas} tarea(s) · {a.tareasPendientes} pendiente(s)
                  </small>
                </div>
                <button
                  className="peligro"
                  title={a.totalTareas > 0 ? "Primero elimina sus tareas" : "Eliminar alumno"}
                  disabled={op.ocupado}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`¿Eliminar a "${a.nombre}"?`)) return;
                    if (
                      await op.ejecutar(`Eliminar alumno "${a.nombre}"`, () =>
                        ixEliminarAlumno(profesor, grupo.direccion, a.direccion),
                      )
                    )
                      if (d === seleccionado) seleccionar(null);
                  }}
                >
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="regla">Regla: un alumno solo se elimina si no tiene tareas.</p>
    </section>
  );
}
