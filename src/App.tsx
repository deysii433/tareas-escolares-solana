import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Alumno, Grupo, Tarea } from "../clients/js/src/generated";
import { INTERFAZ } from "./config/interfaz";
import { EXPLORER_CUENTA, PROGRAM_ID_TEXTO, PROGRAMA_SIN_CONFIGURAR } from "./solana/config";
import { leerAlumnos, leerGrupos, leerTareas, type ConDireccion } from "./solana/lecturas";
import { traducirError } from "./solana/errores";
import { useOperacion } from "./useOperacion";
import { BarraEstado } from "./components/BarraEstado";
import { PanelGrupos } from "./components/PanelGrupos";
import { PanelAlumnos } from "./components/PanelAlumnos";
import { PanelTareas } from "./components/PanelTareas";

export default function App() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [saldo, setSaldo] = useState<number | null>(null);
  const [grupos, setGrupos] = useState<ConDireccion<Grupo>[]>([]);
  const [alumnos, setAlumnos] = useState<ConDireccion<Alumno>[]>([]);
  const [tareas, setTareas] = useState<ConDireccion<Tarea>[]>([]);
  const [grupoSel, setGrupoSel] = useState<string | null>(null);
  const [alumnoSel, setAlumnoSel] = useState<string | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);

  const grupo = grupos.find((g) => g.direccion.toBase58() === grupoSel) ?? null;
  const alumno = alumnos.find((a) => a.direccion.toBase58() === alumnoSel) ?? null;

  // ---- Lecturas (RPC, sin firma) ----
  const recargar = useCallback(async () => {
    if (!publicKey) return;
    setErrorLectura(null);
    try {
      setSaldo((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL);
      if (PROGRAMA_SIN_CONFIGURAR) return;
      const gs = await leerGrupos(connection, publicKey);
      setGrupos(gs);
      const g = gs.find((x) => x.direccion.toBase58() === grupoSel);
      if (!g) {
        setAlumnos([]);
        setTareas([]);
        return;
      }
      const as = await leerAlumnos(connection, g.direccion);
      setAlumnos(as);
      const a = as.find((x) => x.direccion.toBase58() === alumnoSel);
      setTareas(a ? await leerTareas(connection, a.direccion) : []);
    } catch (e) {
      setErrorLectura(traducirError(e));
    }
  }, [connection, publicKey, grupoSel, alumnoSel]);

  useEffect(() => {
    if (!publicKey) {
      setGrupos([]);
      setAlumnos([]);
      setTareas([]);
      setSaldo(null);
      setGrupoSel(null);
      setAlumnoSel(null);
      return;
    }
    void recargar();
  }, [publicKey, recargar]);

  const op = useOperacion(recargar);

  return (
    <div className="app">
      <header className="encabezado">
        <div>
          <h1>📚 {INTERFAZ.titulo}</h1>
          <p className="sub">{INTERFAZ.subtitulo}</p>
        </div>
        <WalletMultiButton />
      </header>

      <section className="info">
        <span>
          Red: <b>Devnet</b>
        </span>
        <span>
          Programa:{" "}
          <a href={EXPLORER_CUENTA(PROGRAM_ID_TEXTO)} target="_blank" rel="noreferrer">
            <code>{PROGRAM_ID_TEXTO.slice(0, 6)}…{PROGRAM_ID_TEXTO.slice(-6)}</code>
          </a>
        </span>
        {publicKey && (
          <span>
            Saldo: <b>{saldo === null ? "…" : saldo.toFixed(3)} SOL</b>
            {saldo !== null && saldo < 0.05 && (
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">
                {" "}· pedir SOL
              </a>
            )}
          </span>
        )}
        {publicKey && (
          <button className="secundario" onClick={() => void recargar()} disabled={op.ocupado}>
            ↻ Recargar
          </button>
        )}
      </section>

      {PROGRAMA_SIN_CONFIGURAR && (
        <div className="aviso">
          ⚠️ El IDL todavía no tiene tu Program ID. Despliega el programa en Solana Playground y ejecuta{" "}
          <code>npm run configurar:idl -- --program-id &lt;TU_PROGRAM_ID&gt;</code>. Mientras tanto las
          operaciones están bloqueadas.
        </div>
      )}
      {errorLectura && <div className="aviso error">Error al leer cuentas: {errorLectura}</div>}

      <BarraEstado estado={op.estado} />

      {!publicKey ? (
        <div className="vacio grande">Conecta tu wallet (en Devnet) para empezar.</div>
      ) : (
        <main className="columnas">
          <PanelGrupos
            profesor={publicKey}
            grupos={grupos}
            seleccionado={grupoSel}
            seleccionar={(d) => {
              setGrupoSel(d);
              setAlumnoSel(null);
            }}
            op={op}
            bloqueado={PROGRAMA_SIN_CONFIGURAR}
          />
          <PanelAlumnos
            profesor={publicKey}
            grupo={grupo}
            alumnos={alumnos}
            seleccionado={alumnoSel}
            seleccionar={setAlumnoSel}
            op={op}
          />
          <PanelTareas profesor={publicKey} grupo={grupo} alumno={alumno} tareas={tareas} op={op} />
        </main>
      )}

      <footer>
        Proyecto final · Solana Engineering Track Advanced · WayLearn
      </footer>
    </div>
  );
}
