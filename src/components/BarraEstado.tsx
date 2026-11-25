import { EXPLORER } from "../solana/config";
import type { Estado } from "../useOperacion";

export function BarraEstado({ estado }: { estado: Estado }) {
  if (estado.tipo === "inactivo") return null;
  if (estado.tipo === "enviando")
    return <div className="estado enviando">⏳ {estado.texto}: esperando firma y confirmación…</div>;
  if (estado.tipo === "exito")
    return (
      <div className="estado exito">
        ✅ {estado.texto} confirmado.{" "}
        <a href={EXPLORER(estado.firma)} target="_blank" rel="noreferrer">
          Ver transacción en el Explorer
        </a>
        <div className="firma">
          <code>{estado.firma}</code>
        </div>
      </div>
    );
  return <div className="estado error">❌ {estado.texto}</div>;
}
