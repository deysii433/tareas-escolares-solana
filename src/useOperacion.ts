import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { enviar, type InstruccionKit } from "./solana/tx";
import { traducirError } from "./solana/errores";

export type Estado =
  | { tipo: "inactivo" }
  | { tipo: "enviando"; texto: string }
  | { tipo: "exito"; texto: string; firma: string }
  | { tipo: "error"; texto: string };

/** Envía una operación firmada y expone el estado (enviando / éxito / error). */
export function useOperacion(alTerminar: () => void) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });

  const ejecutar = useCallback(
    async (texto: string, construir: () => InstruccionKit) => {
      setEstado({ tipo: "enviando", texto });
      try {
        const ix = construir(); // valida en el cliente antes de firmar
        const firma = await enviar(connection, wallet, [ix]);
        setEstado({ tipo: "exito", texto, firma });
        alTerminar();
        return true;
      } catch (e) {
        console.error(e);
        setEstado({ tipo: "error", texto: traducirError(e) });
        return false;
      }
    },
    [connection, wallet, alTerminar],
  );

  return { estado, ejecutar, ocupado: estado.tipo === "enviando" };
}
