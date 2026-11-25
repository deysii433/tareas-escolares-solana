import { useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import type { Alumno, Grupo, Tarea } from "../../clients/js/src/generated";
import { INTERFAZ } from "../config/interfaz";
import {
  ixCalificarTarea,
  ixCrearTarea,
  ixEditarTarea,
  ixEliminarTarea,
} from "../solana/acciones";
import type { ConDireccion } from "../solana/lecturas";
import type { useOperacion } from "../useOperacion";

type Props = {
  profesor: PublicKey;
  grupo: ConDireccion<Grupo> | null;
  alumno: ConDireccion<Alumno> | null;
  tareas: ConDireccion<Tarea>[];
  op: ReturnType<typeof useOperacion>;
};

export function PanelTareas({ profesor, grupo, alumno, tareas, op }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  if (!grupo || !alumno)
    return (
      <section className="panel">
        <h2>3 · Tareas</h2>
        <p className="vacio">Selecciona un alumno.</p>
      </section>
    );

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    if (
      await op.ejecutar(`Crear tarea "${t}"`, () =>
        ixCrearTarea(profesor, grupo.direccion, alumno.direccion, t, descripcion.trim()),
      )
    ) {
      setTitulo("");
      setDescripcion("");
    }
  };

  return (
    <section className="panel">
      <h2>3 · Tareas de {alumno.nombre}</h2>
      <form onSubmit={crear} className="formulario columna">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={`Título. Ej. ${INTERFAZ.ejemplos.tarea}`}
          maxLength={32}
        />
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={`Descripción (opcional). Ej. ${INTERFAZ.ejemplos.descripcion}`}
          maxLength={200}
          rows={2}
        />
        <button disabled={op.ocupado || !titulo.trim()}>Crear tarea</button>
      </form>

      {tareas.length === 0 ? (
        <p className="vacio">Sin tareas.</p>
      ) : (
        <ul className="lista tareas">
          {tareas.map((t) => (
            <FilaTarea
              key={t.direccion.toBase58()}
              tarea={t}
              op={op}
              editar={(desc) =>
                op.ejecutar(`Editar "${t.titulo}"`, () =>
                  ixEditarTarea(profesor, grupo.direccion, alumno.direccion, t.direccion, desc),
                )
              }
              calificar={(cal) =>
                op.ejecutar(`Calificar "${t.titulo}" con ${cal}`, () =>
                  ixCalificarTarea(profesor, grupo.direccion, alumno.direccion, t.direccion, cal),
                )
              }
              eliminar={() =>
                op.ejecutar(`Eliminar "${t.titulo}"`, () =>
                  ixEliminarTarea(profesor, grupo.direccion, alumno.direccion, t.direccion),
                )
              }
            />
          ))}
        </ul>
      )}
      <p className="regla">
        Reglas: una tarea calificada ya no se edita, y solo se pueden eliminar tareas calificadas.
      </p>
    </section>
  );
}

function FilaTarea({
  tarea,
  op,
  editar,
  calificar,
  eliminar,
}: {
  tarea: ConDireccion<Tarea>;
  op: ReturnType<typeof useOperacion>;
  editar: (descripcion: string) => Promise<boolean>;
  calificar: (calificacion: number) => Promise<boolean>;
  eliminar: () => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [desc, setDesc] = useState(tarea.descripcion);
  const [cal, setCal] = useState(tarea.calificada ? String(tarea.calificacion) : "");

  return (
    <li className="tarea">
      <div className="cabecera">
        <b>{tarea.titulo}</b>
        {tarea.calificada ? (
          <span className="etiqueta ok">Calificada: {tarea.calificacion}</span>
        ) : (
          <span className="etiqueta pendiente">Pendiente</span>
        )}
      </div>

      {editando ? (
        <div className="formulario">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} />
          <button
            disabled={op.ocupado}
            onClick={async () => {
              if (await editar(desc.trim())) setEditando(false);
            }}
          >
            Guardar
          </button>
          <button className="secundario" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <p className="descripcion">{tarea.descripcion || <i>Sin descripción</i>}</p>
      )}

      <div className="acciones">
        <input
          type="number"
          min={0}
          max={100}
          value={cal}
          onChange={(e) => setCal(e.target.value)}
          placeholder="0-100"
          className="nota"
        />
        <button disabled={op.ocupado || cal === ""} onClick={() => void calificar(Number(cal))}>
          {tarea.calificada ? "Corregir nota" : "Calificar"}
        </button>
        <button
          className="secundario"
          disabled={op.ocupado}
          title={tarea.calificada ? "El programa rechazará la edición" : ""}
          onClick={() => setEditando(true)}
        >
          ✏️ Editar
        </button>
        <button
          className="peligro"
          disabled={op.ocupado}
          title={tarea.calificada ? "Eliminar" : "El programa rechazará: aún no está calificada"}
          onClick={() => {
            if (confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) void eliminar();
          }}
        >
          🗑
        </button>
      </div>
    </li>
  );
}
