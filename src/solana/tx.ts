import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import type { WalletContextState } from "@solana/wallet-adapter-react";

/** Forma mínima de una instrucción de @solana/kit (la que genera Codama). */
export type InstruccionKit = {
  programAddress: string;
  accounts?: readonly { address: string; role: number }[];
  data?: ArrayLike<number>;
};

/**
 * Convierte una instrucción generada por Codama (@solana/kit) a web3.js,
 * que es lo que entiende Wallet Adapter.
 * AccountRole: 0 READONLY · 1 WRITABLE · 2 READONLY_SIGNER · 3 WRITABLE_SIGNER
 */
export function aWeb3(ix: InstruccionKit): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programAddress),
    keys: (ix.accounts ?? []).map((a) => ({
      pubkey: new PublicKey(a.address),
      isSigner: a.role >= 2,
      isWritable: (a.role & 1) === 1,
    })),
    data: Buffer.from(Uint8Array.from(ix.data ?? [])),
  });
}

/**
 * Prepara, firma (wallet), envía y confirma una transacción.
 * Devuelve la firma para verla en el Explorer.
 */
export async function enviar(
  connection: Connection,
  wallet: WalletContextState,
  instrucciones: InstruccionKit[],
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Conecta tu wallet primero.");

  const tx = new Transaction().add(...instrucciones.map(aWeb3));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  // Simulación previa: si el programa rechaza, mostramos el error sin pedir firma.
  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    const error = new Error(`Simulación fallida: ${JSON.stringify(sim.value.err)}`) as Error & {
      logs?: string[] | null;
    };
    error.logs = sim.value.logs;
    throw error;
  }

  const firma = await wallet.sendTransaction(tx, connection);
  const conf = await connection.confirmTransaction(
    { signature: firma, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (conf.value.err) throw new Error(`La transacción falló: ${JSON.stringify(conf.value.err)}`);
  return firma;
}
