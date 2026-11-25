import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./estilos.css";
import App from "./App";
import { RPC_URL } from "./solana/config";

// wallets = [] → se detectan automáticamente las wallets compatibles con
// Wallet Standard (Phantom, Solflare, Backpack...).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
);
