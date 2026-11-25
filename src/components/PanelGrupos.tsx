import { useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import type { Grupo } from "../../clients/js/src/generated";
import { INTERFAZ } from "../config/interfaz";
import { ixCrearGrupo, ixEliminarGrupo } from "../solana/acciones";
import type { ConDireccion } from "../solana/lecturas";
import type { useOperacion } from "../useOperacion";

type Props = {
  profesor: PublicKey;
  grupos: ConDireccion<Grupo>[];
  seleccionado: string | null;
  seleccionar: (direccion: string | null) => void;
  op: ReturnType<typeof useOperacion>;
  bloqueado: boolean;
};

export function PanelGrupos({ profesor, grupos, seleccionado, seleccionar, op, bloqueado }: Props) {
  const [nombre, setNombre] = useState("");

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (await op.ejecutar(`Crear grupo "${n}"`, () => ixCrearGrupo(profesor, n))) setNombre("");
  };

  return (
    <section className="panel">
      <h2>1 · Grupos</h2>
      <form onSubmit={crear} className="formulario">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={`Ej. ${INTERFAZ.ejemplos.grupo}`}
          maxLength={32}
          disabled={bloqueado}
        />
        <button disabled={op.ocupado || bloqueado || !nombre.trim()}>Crear grupo</button>
      </form>

      {grupos.length === 0 ? (
        <p className="vacio">Aún no tienes grupos.</p>
      ) : (
        <ul className="lista">
          {grupos.map((g) => {
            const d = g.direccion.toBase58();
            return (
              <li key={d} className={d === seleccionado ? "activo" : ""} onClick={() => seleccionar(d)}>
                <div>
                  <b>{g.nombre}</b>
                  <small>{g.totalAlumnos} alumno(s)</small>
                </div>
                <button
                  className="peligro"
                  title={g.totalAlumnos > 0 ? "Primero elimina a sus alumnos" : "Eliminar grupo"}
                  disabled={op.ocupado}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`¿Eliminar el grupo "${g.nombre}"?`)) return;
                    if (await op.ejecutar(`Eliminar grupo "${g.nombre}"`, () => ixEliminarGrupo(profesor, g.direccion)))
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
      <p className="regla">Regla: un grupo solo se elimina si ya no tiene alumnos.</p>
    </section>
  );
}
