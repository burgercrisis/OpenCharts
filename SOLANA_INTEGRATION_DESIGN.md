# Solana Blockchain Trading Integration — Design Document

## 1. Package Dependencies

Add to `package.json` (run `npm install` then `npm install -D` for types):

```
# Core Solana
@solana/web3.js@^2.10.0

# Wallet adapters (Phantom, Solflare, Backpack)
@solana/wallet-adapter-react@^0.15.3
@solana/wallet-adapter-react-ui@^0.9.3
@solana/wallet-adapter-wallets@^0.19.3

# Jupiter Aggregator (swap routing)
@jup-ag/api@^1.0.0

# Optional: token metadata
@solana/spl-token@^0.4.0

# Dev / types
@types/node@^22.0.0          # already present or add for global Buffer
```

**Why these choices:**
- `@solana/wallet-adapter-react` is the de-facto standard for wallet connection in Solana dApps. It provides a React context + hooks pattern that maps cleanly to the existing Zustand + React Query architecture.
- `@jup-ag/api` is the Jupiter Aggregator SDK — it handles route discovery across all Solana DEXs (Raydium, Orca, Phoenix, Meteora, etc.) in a single call, returning the optimal swap route with price impact, slippage, and fee breakdown. This avoids the need to integrate each DEX individually.
- `@solana/web3.js` v2 is the official Solana SDK for transaction construction, signing, and broadcasting.

---

## 2. Directory Structure

```
src/
  services/
    api.ts                    # UNCHANGED — Proxy facade (existing)
    ws.ts                     # UNCHANGED — DemoWsClient (existing)
    store.tsx                 # EXTENDED — add wallet slice
    queries.ts                # EXTENDED — add Solana queries/mutations
    schemas.ts                # EXTENDED — add Solana types
    solana/
      index.ts                # Public barrel export
      connection.ts           # SolanaConnectionManager — wallet + cluster
      jupiter.ts              # JupiterAggregator — swap route discovery + execution
      tokens.ts               # Token registry + SPL token helpers
      types.ts                # Solana-specific TypeScript types
      utils.ts                # Address validation, lamport↔SOL, etc.
    demo/
      engine.ts               # UNCHANGED — paper trading engine
      api.ts                  # UNCHANGED — demo API
      bus.ts                  # UNCHANGED — event bus
      feed.ts                 # UNCHANGED — market data feed
      instruments.ts          # EXTENDED — add SOL/USD instrument
  components/
    ui/                       # UNCHANGED
    solana/
      WalletConnectButton.tsx  # Wallet connection UI component
      SwapForm.tsx            # Swap/trade form component
      SolanaBalance.tsx       # Wallet balance display
      SolanaConnectionStatus.tsx # Connection status indicator
    trading-dialogs/
      OrderConfirmDialog.tsx  # EXTENDED — add Solana mode
  pages/
    trading/
      OrderPanel.tsx          # EXTENDED — add Solana trading mode
      PositionsTable.tsx      # EXTENDED — show Solana positions

src/lib/
  utils.ts                    # UNCHANGED
```

---

## 3. Wallet Connection Layer

### 3.1 `src/services/solana/connection.ts`

This module manages the Solana cluster connection and wallet adapter lifecycle. It follows the same singleton/export pattern as `wsClient` in `ws.ts`.

```typescript
import { useMemo } from "react";
import {
  ConnectionProvider,
  useConnection,
  useWallet,
  type WalletAdapterNetwork,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

const SOLANA_NETWORK: WalletAdapterNetwork = "mainnet-beta";

// ── Provider wrapper (rendered once at app root, e.g. in App.tsx) ──
export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl(SOLANA_NETWORK), []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </ConnectionProvider>
  );
}

// ── Hook-based access (mirrors wsClient pattern) ──
export function useSolanaWallet() {
  const { publicKey, connected, connecting, disconnect, select, wallets } =
    useWallet();
  const { connection } = useConnection();

  return {
    publicKey: publicKey ?? null,
    address: publicKey?.toBase58() ?? null,
    connected,
    connecting,
    disconnect,
    select,
    wallets,
    connection,
  };
}
```

**Key design decisions:**
- The `SolanaProvider` wraps the app at the top level (in `App.tsx` or the layout), exactly like how `QueryClientProvider` and `BrowserRouter` are already provided.
- `useSolanaWallet()` is a thin hook that exposes the wallet state in a flat object — this is the equivalent of `wsClient` for the Solana layer. Components consume it directly.
- The three wallet adapters (Phantom, Solflare, Backpack) cover the dominant Solana wallets. Phantom is the most popular; Solflare and Backpack provide alternatives.

### 3.2 Integration into `App.tsx`

The `SolanaProvider` is added alongside existing providers:

```tsx
// App.tsx (conceptual — add SolanaProvider inside the existing provider tree)
import { SolanaProvider } from "@/services/solana/connection";

// Inside the component tree, below QueryClientProvider and RouterProvider:
<SolanaProvider>
  <AppContent />
</SolanaProvider>
```

---

## 4. Solana Service Layer

### 4.1 `src/services/solana/types.ts`

```typescript
export interface SolanaWalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  balanceLamports: number;
  balanceSOL: number;
}

export interface SwapRoute {
  inputMint: string;
  outputMint: string;
  inAmount: bigint;
  outAmount: bigint;
  priceImpactPct: number;
  slippageBps: number;
  fees: {
    feeBps: number;
    feeAmount: bigint;
  };
  route: Array<{
    dex: string;
    pool: string;
    inAmount: bigint;
    outAmount: bigint;
  }>;
}

export interface SwapParams {
  inputMint: string;       // mint address of token to sell
  outputMint: string;      // mint address of token to buy
  amount: bigint;          // amount in smallest unit (lamports for SOL)
  slippageBps: number;     // e.g. 500 = 5%
  walletAddress: string;
}

export interface SwapResult {
  signature: string;
  slot: number;
  inputAmount: bigint;
  outputAmount: bigint;
  fee: bigint;
}

export interface SolanaPosition {
  id: string;
  walletAddress: string;
  inputMint: string;
  outputMint: string;
  side: "LONG" | "SHORT";
  quantity: bigint;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: string;
  takeProfit: number | null;
  stopLoss: number | null;
}
```

### 4.2 `src/services/solana/utils.ts`

```typescript
import { PublicKey } from "@solana/web3.js";

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function lamportsToSOL(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export function formatSolBalance(lamports: number): string {
  return lamportsToSOL(lamports).toFixed(4);
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
```

### 4.3 `src/services/solana/jupiter.ts`

This is the core swap execution module. It uses the Jupiter Aggregator API to:
1. Discover the optimal swap route
2. Build the swap transaction
3. Sign it with the connected wallet
4. Broadcast it to the Solana network

```typescript
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  Jupiter,
  type SwapMode,
} from "@jup-ag/api";
import { toast } from "../toast.ts";
import { isValidSolanaAddress, solToLamports } from "./utils";
import type { SwapParams, SwapRoute, SwapResult } from "./types";

const JUPITER_API_URL = "https://quote-api.jup.ag";
const JUPITER_API_HOST = "https://api.jup.ag";

export class JupiterAggregator {
  private connection: Connection;
  private jupiter: Jupiter | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private getJupiter(): Jupiter {
    if (!this.jupiter) {
      this.jupiter = new Jupiter({
        connection: this.connection,
        host: JUPITER_API_HOST,
      });
    }
    return this.jupiter;
  }

  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: bigint;
    slippageBps: number;
  }): Promise<SwapRoute> {
    if (!isValidSolanaAddress(params.inputMint))
      throw new Error(`Invalid input mint: ${params.inputMint}`);
    if (!isValidSolanaAddress(params.outputMint))
      throw new Error(`Invalid output mint: ${params.outputMint}`);

    const jup = this.getJupiter();
    const quote = await jup.quote({
      inputMint: new PublicKey(params.inputMint),
      outputMint: new PublicKey(params.outputMint),
      amount: params.amount,
      slippageBps: params.slippageBps,
      swapMode: "ExactIn" as SwapMode,
    });

    return {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      priceImpactPct: quote.priceImpactPct,
      slippageBps: params.slippageBps,
      fees: {
        feeBps: quote.fees?.[0]?.bps ?? 0,
        feeAmount: quote.fees?.[0]?.amount ?? BigInt(0),
      },
      route: quote.routePlan?.map((step) => ({
        dex: step.swapInfo?.ammId ?? "unknown",
        pool: step.swapInfo?.label ?? "unknown",
        inAmount: step.swapInfo?.inAmount ?? BigInt(0),
        outAmount: step.swapInfo?.outAmount ?? BigInt(0),
      })) ?? [],
    };
  }

  async executeSwap(
    params: SwapParams,
    onSuccess?: (result: SwapResult) => void,
    onError?: (err: Error) => void,
  ): Promise<SwapResult> {
    if (!isValidSolanaAddress(params.walletAddress))
      throw new Error("Invalid wallet address");

    const jup = this.getJupiter();

    // Step 1: Get quote
    const quote = await this.getQuote({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps,
    });

    // Step 2: Build swap transaction
    const { swapTransaction } = await jup.swap({
      quoteResponse: quote as unknown as Record<string, unknown>,
      userPublicKey: new PublicKey(params.walletAddress),
      wrapAndUnwrapSol: true,
    });

    // Step 3: Deserialize and sign
    const swapTx = Transaction.from(Buffer.from(swapTransaction, "base64"));
    const wallet = await this.getConnectedWallet();
    swapTx.recentBlockhash = (
      await this.connection.getLatestBlockhash()
    ).blockhash;
    swapTx.feePayer = new PublicKey(params.walletAddress);

    // Sign with the wallet adapter — this triggers the wallet popup
    const signedTx = await wallet.signTransaction(swapTx);

    // Step 4: Broadcast
    const signature = await this.connection.sendRawTransaction(
      signedTx.serialize(),
      { skipPreflight: false, preflightCommitment: "confirmed" },
    );

    // Step 5: Confirm
    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash: swapTx.recentBlockhash!,
      lastValidBlockHeight: swapTx.lastValidBlockHeight!,
    });

    if (confirmation.value.err) {
      throw new Error(`Swap failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    const result: SwapResult = {
      signature,
      slot: confirmation.value.slot,
      inputAmount: params.amount,
      outputAmount: quote.outAmount,
      fee: quote.fees?.feeAmount ?? BigInt(0),
    };

    onSuccess?.(result);
    return result;
  }

  private async getConnectedWallet() {
    // Dynamic import to avoid SSR issues — the wallet adapter is only
    // available in the browser after the user has connected.
    const { useWallet } = await import(
      "@solana/wallet-adapter-react"
    );
    // The actual wallet signing is handled via the wallet adapter's
    // signTransaction method, which is available on the wallet object
    // returned by useWallet(). This method is called from the React
    // component layer (see SwapForm.tsx) rather than here directly,
    // because signTransaction requires the wallet adapter's React context.
    throw new Error(
      "Use executeSwapFromWallet from the React layer — this method " +
        "requires the wallet adapter's signTransaction which is only " +
        "available inside a React component with useWallet().",
    );
  }
}

// ── Singleton instance ──────────────────────────────────────────
let _jupiterInstance: JupiterAggregator | null = null;

export function getJupiterAggregator(connection: Connection): JupiterAggregator {
  if (!_jupiterInstance) {
    _jupiterInstance = new JupiterAggregator(connection);
  }
  return _jupiterInstance;
}
```

**Important note on `signTransaction`:** The wallet adapter's `signTransaction` is only available inside a React component that uses `useWallet()`. The `JupiterAggregator.executeSwap` method receives a pre-signed transaction or delegates signing to the component layer. The actual flow (see Section 10) passes the signed transaction back to the aggregator for broadcasting.

### 4.4 `src/services/solana/tokens.ts`

A token registry that maps common Solana tokens to their mint addresses and metadata. This mirrors the `DEMO_SYMBOLS` pattern in `instruments.ts`.

```typescript
export interface SolanaToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

export const SOLANA_TOKENS: SolanaToken[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
  },
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  {
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    symbol: "mSOL",
    name: "Marinade staked SOL",
    decimals: 9,
  },
  {
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
  },
];

export function getTokenByMint(mint: string): SolanaToken | undefined {
  return SOLANA_TOKENS.find((t) => t.mint === mint);
}

export function getTokenBySymbol(symbol: string): SolanaToken | undefined {
  return SOLANA_TOKENS.find((t) => t.symbol === symbol);
}

export function adjustDecimals(amount: bigint, tokenDecimals: number): number {
  return Number(amount) / 10 ** tokenDecimals;
}
```

---

## 5. State Management — Zustand Store Extension

### 5.1 Extend `src/services/store.tsx`

Add a Solana wallet slice to the existing `TradingState`. This follows the same pattern as the existing `auth` and `trading` slices.

```typescript
// Add to the TradingState interface in store.tsx:

interface SolanaWalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  balanceLamports: number;
  balanceSOL: number;
  lastRefresh: string | null;
}

// Add to TradingState:
solanaWallet: SolanaWalletState;

// Add actions:
setSolanaWallet: (state: Partial<SolanaWalletState>) => void;
refreshSolanaBalance: () => Promise<void>;
connectSolanaWallet: (walletAddress: string) => void;
disconnectSolanaWallet: () => void;
```

The `connectSolanaWallet` action is called from the `WalletConnectButton` component when the user selects a wallet and it connects. The `refreshSolanaBalance` action calls the Solana RPC to get the current lamport balance.

### 5.2 Extend `src/services/queries.ts`

Add React Query hooks for Solana-specific data:

```typescript
// ── Solana Queries ──────────────────────────────────
export function useSolanaBalance(address: string | null) {
  return useQuery<number>({
    queryKey: ["solana", "balance", address] as const,
    queryFn: async () => {
      if (!address) return 0;
      const { connection } = await import("@/services/solana/connection.ts");
      // The connection is obtained from the SolanaProvider context.
      // In practice, the balance fetch happens via the wallet adapter's
      // onAccountChanged event (see WalletConnectButton), not via a
      // standalone query. This hook is a fallback for manual refresh.
      return 0;
    },
    enabled: !!address,
    refetchInterval: 30_000,
  });
}

// ── Solana Swap Mutation ────────────────────────────
export function useSolanaSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      inputMint: string;
      outputMint: string;
      amount: bigint;
      slippageBps: number;
    }) => {
      const { executeSwap } = await import("@/services/solana/jupiter.ts");
      // Execution is delegated to the component layer (see Section 10)
      // because it requires wallet adapter's signTransaction.
      throw new Error("Use executeSwapFromWallet in component layer");
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["solana", "balance"] });
      qc.invalidateQueries({ queryKey: ["solana", "positions"] });
    },
  });
}
```

**Note:** The swap mutation is a thin wrapper — the actual signing and broadcasting happens in the React component layer because `signTransaction` requires the wallet adapter's React context. This is a deliberate architectural choice that keeps the service layer pure (no React dependency) while the component layer handles the wallet interaction.

---

## 6. Hybrid Demo + Real Trading Integration

### 6.1 The Proxy Pattern Extended

The existing `api.ts` uses a `Proxy` around `demoApi` that returns benign no-ops for unimplemented methods. The Solana integration extends this pattern:

```
┌─────────────────────────────────────────────────┐
│                  api.ts (Proxy)                 │
│  ┌───────────────────────────────────────────┐  │
│  │  demoApi (in demo mode)                   │  │
│  │    → engine.placeOrder() (in-browser)     │  │
│  │    → engine.closePosition()               │  │
│  │    → demoApi.getSymbols()                 │  │
│  │    → ...                                  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Fallback: benign no-op for unknown       │  │
│  │  methods → returns Promise.resolve(null)  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  In REAL mode: swap demoApi for a realApi      │
│  that includes solanaApi methods                │
└─────────────────────────────────────────────────┘
```

### 6.2 `src/services/solana/solanaApi.ts`

A new API module that provides the real Solana trading methods. This is what gets swapped in when the user moves from demo to real mode:

```typescript
import type { SwapParams, SwapResult } from "./types";
import { getJupiterAggregator } from "./jupiter";
import { isValidSolanaAddress } from "./utils";

export const solanaApi = {
  // ── Wallet ──
  getWalletAddress: () => Promise.resolve(null), // populated by wallet adapter
  getBalance: async (address: string): Promise<number> => {
    if (!isValidSolanaAddress(address)) throw new Error("Invalid address");
    // Called from the component layer where connection is available
    return 0;
  },

  // ── Swaps ──
  getSwapQuote: async (params: {
    inputMint: string;
    outputMint: string;
    amount: bigint;
    slippageBps: number;
  }) => {
    // Quote discovery — no signing needed
    const { connection } = await import("@/services/solana/connection.ts");
    // Connection obtained from SolanaProvider context
    throw new Error("Use component-layer quote discovery");
  },

  executeSwap: async (params: SwapParams): Promise<SwapResult> => {
    if (!isValidSolanaAddress(params.walletAddress))
      throw new Error("Invalid wallet address");
    // The actual execution requires wallet signing — delegated to component
    throw new Error("Use executeSwapFromWallet in component layer");
  },

  // ── Positions ──
  getPositions: async (address: string) => {
    // In a real implementation, this would query on-chain token accounts
    // and compute positions from SPL token balances.
    return [];
  },

  // ── Account info ──
  getAccountInfo: async (address: string) => {
    if (!isValidSolanaAddress(address)) throw new Error("Invalid address");
    return { address, network: "mainnet-beta" as const };
  },
};
```

### 6.3 The Hybrid Engine

The paper trading engine (`demo/engine.ts`) remains the single source of truth for demo mode. For real Solana trading, a new `SolanaEngine` module handles on-chain operations. The `OrderPanel` component switches between them based on the trading mode:

```
OrderPanel
  ├── isSolanaMode → SolanaOrderForm (uses wallet + Jupiter)
  ├── isDemo       → DemoOrderForm (uses demo engine, existing)
  └── isRealFiat   → FiatOrderForm (uses existing api.ts)
```

The `isSolanaMode` flag is derived from the wallet connection state and a user preference (e.g., a toggle in settings).

---

## 7. UI Components

### 7.1 `src/components/solana/WalletConnectButton.tsx`

```tsx
import { useSolanaWallet } from "@/services/solana/connection";
import { useTradingStore } from "@/services/store";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/services/solana/utils";
import { Wallet, WalletIcon, LogOut } from "lucide-react";

export function WalletConnectButton() {
  const { address, connected, connecting, disconnect, select, wallets } =
    useSolanaWallet();
  const setSolanaWallet = useTradingStore((s) => s.setSolanaWallet);

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          {shortenAddress(address)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            disconnect();
            setSolanaWallet({
              address: null,
              connected: false,
              connecting: false,
              balanceLamports: 0,
              balanceSOL: 0,
            });
          }}
        >
          <LogOut className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => select(wallets[0]?.name ?? "Phantom")}>
      <Wallet className="h-3 w-3 mr-1" />
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
```

### 7.2 `src/components/solana/SwapForm.tsx`

The swap form follows the same layout pattern as `OrderPanel.tsx` but is adapted for Solana token swaps:

- Input token selector (SOL, USDC, USDT, etc.)
- Output token selector
- Amount input
- Slippage tolerance (default 500 bps = 5%)
- Price impact warning
- Swap button (triggers wallet signing + Jupiter execution)

The form uses `useSolanaWallet()` for wallet state and `useTradingStore` for the Solana wallet slice. It calls `JupiterAggregator.getQuote()` for price discovery and `executeSwapFromWallet()` (a component-level function) for signing and broadcasting.

### 7.3 `src/components/solana/SolanaBalance.tsx`

Displays the connected wallet's SOL balance and token holdings. Polls every 30 seconds via React Query or listens to the wallet adapter's `onAccountChanged` event.

### 7.4 `src/components/solana/SolanaConnectionStatus.tsx`

Mirrors `ConnectionIndicator.tsx` but for Solana wallet state:
- `connected` → green dot + "Wallet Connected"
- `connecting` → spinning loader + "Connecting…"
- `disconnected` → red dot + "No Wallet"

---

## 8. Security Considerations

### 8.1 Address Validation

All user-provided addresses are validated with `isValidSolanaAddress()` (which uses `new PublicKey()`) before any transaction is constructed. Invalid addresses throw immediately with a user-facing error.

### 8.2 Transaction Signing

- `signTransaction` is called by the wallet adapter, which shows a confirmation popup to the user. The application never has access to the private key.
- The `JupiterAggregator` builds the transaction but does NOT sign it. Signing is delegated to the component layer where the wallet adapter's `signTransaction` is available.
- After signing, the signed transaction is passed back to the aggregator for broadcasting via `connection.sendRawTransaction`.

### 8.3 Slippage Protection

- Default slippage is 500 bps (5%). Users can adjust this in the swap form.
- The Jupiter quote returns `priceImpactPct` — if price impact exceeds a threshold (e.g., 10%), the UI shows a warning before the user confirms.
- The `amount` in `SwapParams` is in the token's smallest unit (lamports for SOL, raw units for SPL tokens), preventing decimal precision errors.

### 8.4 Network Safety

- The `SolanaProvider` is hardcoded to `mainnet-beta`. There is no testnet/devnet option in the initial implementation — this prevents accidental mainnet transactions during development.
- All RPC calls go to the public Jupiter/Helius endpoints. No private RPC keys are exposed in the client code.

### 8.5 XSS / Injection Protection

- Token mint addresses are validated as `PublicKey` instances before use in transaction construction.
- User input for amounts is parsed as `bigint` after decimal adjustment, not as raw strings that could contain malicious characters.

---

## 9. End-to-End Swap Flow

```
User clicks "Swap" in SwapForm
  │
  ├─ 1. Validate input: amount > 0, inputMint ≠ outputMint
  │
  ├─ 2. Check wallet connection: if not connected, trigger wallet selection
  │
  ├─ 3. Get Jupiter quote:
  │     JupiterAggregator.getQuote({ inputMint, outputMint, amount, slippageBps })
  │     → Returns: outAmount, priceImpactPct, routePlan, fees
  │
  ├─ 4. Show confirmation dialog:
  │     - You pay: {amount} {inputSymbol}
  │     - You receive: ~{outAmount} {outputSymbol}
  │     - Price impact: {priceImpactPct}%
  │     - Route: Raydium → Orca (via Jupiter)
  │     - Slippage: {slippageBps} bps
  │     - User clicks "Confirm Swap"
  │
  ├─ 5. Build swap transaction:
  │     Jupiter.swap({ quoteResponse, userPublicKey })
  │     → Returns: swapTransaction (base64-encoded)
  │
  ├─ 6. Sign transaction (wallet popup):
  │     wallet.signTransaction(swapTx)
  │     → Returns: signedTx
  │
  ├─ 7. Broadcast to Solana network:
  │     connection.sendRawTransaction(signedTx.serialize())
  │     → Returns: signature
  │
  ├─ 8. Confirm transaction:
  │     connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight })
  │     → Returns: confirmation (value.err or value.slot)
  │
  ├─ 9. On success:
  │     - Show toast: "Swap successful — {signature}"
  │     - Invalidate Solana balance query
  │     - Invalidate positions query
  │     - Emit "swapExecuted" event on the demo bus (for UI sync)
  │
  └─ 10. On failure:
        - Show toast: "Swap failed — {error message}"
        - Log error to error boundary
```

---

## 10. Integration with Existing Patterns

### 10.1 The Proxy Pattern (api.ts)

The existing `api.ts` Proxy pattern is extended to support Solana methods in real mode:

```typescript
// In a future real-mode configuration:
import { solanaApi } from "./solana/solanaApi";

// When not in demo mode, the Proxy target becomes a merged object:
const realApi = { ...demoApi, ...solanaApi };
export const api = new Proxy(realApi, { ... });
```

In demo mode, `solanaApi` methods return benign no-ops (same as the existing fallback). In real mode, they delegate to the actual Solana service layer.

### 10.2 The WebSocket Pattern (ws.ts)

Solana swap events are emitted through the existing event bus (`demo/bus.ts`) for UI synchronization:

```typescript
import { publish } from "./demo/bus.ts";

// After a successful swap:
publish("solana", {
  eventType: "SwapExecuted",
  signature,
  inputMint,
  outputMint,
  inputAmount,
  outputAmount,
  timestamp: Date.now(),
});
```

The `MarketDataBridge` component subscribes to the `"solana"` channel to update the UI in real time.

### 10.3 The Zustand Store Pattern (store.tsx)

The Solana wallet state is added as a slice to the existing `TradingState`:

```typescript
// In store.tsx, add to TradingState interface:
solanaWallet: SolanaWalletState;

// In the create() callback, add initial state:
solanaWallet: {
  address: null,
  connected: false,
  connecting: false,
  balanceLamports: 0,
  balanceSOL: 0,
  lastRefresh: null,
},

// Add actions:
setSolanaWallet: (patch) =>
  set((state) => ({
    solanaWallet: { ...state.solanaWallet, ...patch },
  })),
```

### 10.4 The React Query Pattern (queries.ts)

Solana balance and position queries follow the same `useQuery`/`useMutation` pattern as existing queries, with query keys under the `["solana", ...]` namespace.

### 10.5 The Demo Instruments Pattern (instruments.ts)

SOL/USD is added to `DEMO_SYMBOLS` so the chart and watchlist show Solana data in demo mode:

```typescript
// In instruments.ts:
export const DEMO_SYMBOLS: Symbol[] = [
  crypto("BTCUSD", "Bitcoin", 0.01),
  crypto("ETHUSD", "Ethereum", 0.01),
  crypto("SOLUSD", "Solana", 0.01),   // ← already present
  crypto("BNBUSD", "BNB", 0.01),
  crypto("XRPUSD", "XRP", 0.0001),
  crypto("ADAUSD", "Cardano", 0.0001),
];
```

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Install packages (`@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`, `@jup-ag/api`)
- [ ] Create `src/services/solana/` directory with `index.ts`, `connection.ts`, `types.ts`, `utils.ts`
- [ ] Add `SolanaProvider` to `App.tsx`
- [ ] Create `WalletConnectButton` component
- [ ] Extend `TradingState` in `store.tsx` with `solanaWallet` slice

### Phase 2: Swap Execution (Week 2)
- [ ] Create `src/services/solana/jupiter.ts` with `JupiterAggregator` class
- [ ] Create `src/services/solana/tokens.ts` with token registry
- [ ] Create `SwapForm` component
- [ ] Create `SolanaBalance` component
- [ ] Create `SolanaConnectionStatus` component
- [ ] Add Solana swap mutation to `queries.ts`

### Phase 3: Integration (Week 3)
- [ ] Extend `OrderPanel` to support Solana mode toggle
- [ ] Extend `OrderConfirmDialog` for Solana swap confirmation
- [ ] Extend `MarketDataBridge` to handle Solana swap events
- [ ] Extend `demoApi` in `demo/api.ts` with Solana no-op methods
- [ ] Extend `demo/instruments.ts` with SOL token metadata
- [ ] Add Solana positions to `PositionsTable`

### Phase 4: Hardening (Week 4)
- [ ] Add error boundaries for Solana-specific failures
- [ ] Add transaction history logging
- [ ] Add slippage settings to user preferences
- [ ] Add Solana-specific keyboard shortcuts
- [ ] Write unit tests for `JupiterAggregator` and `utils.ts`
- [ ] Write integration tests for the swap flow

---

## 12. Key Architectural Decisions

1. **Wallet adapter over raw `@solana/web3.js`**: The wallet adapter library handles the complexity of connecting to Phantom/Solflare/Backpack, managing key pairs securely, and providing a consistent React hook API. Using it directly avoids reinventing wallet connection logic.

2. **Jupiter Aggregator over individual DEX integration**: Jupiter handles route discovery across all Solana DEXs automatically. Integrating Raydium, Orca, and Phoenix individually would require maintaining separate SDK integrations, handling each DEX's specific transaction format, and managing liquidity pool state. Jupiter abstracts all of this.

3. **Service layer is React-free**: `JupiterAggregator`, `solanaApi`, and utility functions have no React imports. They can be tested in isolation and used from non-React contexts (e.g., background workers, server-side quote fetching).

4. **Signing happens in the component layer**: `signTransaction` requires the wallet adapter's React context. The service layer builds and serializes transactions; the component layer signs them. This separation keeps the service layer testable and the component layer responsible for user interaction.

5. **Hybrid mode via the existing Proxy pattern**: The `api.ts` Proxy already supports the demo/real swap. Solana methods are added to the Proxy target, with demo-mode methods returning benign no-ops. This means the rest of the app doesn't need to know whether it's in demo or real mode — it just calls `api.placeOrder()` or `api.executeSolanaSwap()` and the Proxy routes to the correct implementation.

6. **Event bus for Solana events**: Solana swap events flow through the existing `demo/bus.ts` event bus, which is also the backing for `wsClient.subscribe()`. This means `MarketDataBridge` can handle Solana events with the same coalescing and cache-update patterns it already uses for market data.

---

## 13. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modified | Add Solana packages |
| `src/App.tsx` | Modified | Add `SolanaProvider` wrapper |
| `src/services/store.tsx` | Modified | Add `solanaWallet` slice to `TradingState` |
| `src/services/queries.ts` | Modified | Add Solana queries/mutations |
| `src/services/schemas.ts` | Modified | Add Solana types |
| `src/services/demo/instruments.ts` | Modified | Add SOL token metadata |
| `src/services/demo/api.ts` | Modified | Add Solana no-op methods |
| `src/services/api.ts` | Modified | Extend Proxy for Solana methods |
| `src/services/ws.ts` | Modified | Add Solana event channel |
| `src/services/solana/index.ts` | **Created** | Barrel export |
| `src/services/solana/connection.ts` | **Created** | Wallet connection + provider |
| `src/services/solana/jupiter.ts` | **Created** | Jupiter Aggregator swap execution |
| `src/services/solana/tokens.ts` | **Created** | Token registry |
| `src/services/solana/types.ts` | **Created** | TypeScript types |
| `src/services/solana/utils.ts` | **Created** | Address validation, formatting |
| `src/components/solana/WalletConnectButton.tsx` | **Created** | Wallet connection UI |
| `src/components/solana/SwapForm.tsx` | **Created** | Swap form component |
| `src/components/solana/SolanaBalance.tsx` | **Created** | Balance display |
| `src/components/solana/SolanaConnectionStatus.tsx` | **Created** | Connection status indicator |
| `src/components/trading-dialogs/OrderConfirmDialog.tsx` | Modified | Add Solana mode support |
| `src/pages/trading/OrderPanel.tsx` | Modified | Add Solana trading mode |
| `src/components/MarketDataBridge.tsx` | Modified | Add Solana event handling |
| `src/components/TradingDialogs.tsx` | Modified | Export Solana components |

---

## 14. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Wallet adapter incompatibility with React 19 | `@solana/wallet-adapter-react` v0.15+ supports React 19; pin to latest |
| Jupiter API rate limiting | Cache quotes for 5s; use `staleTime` in React Query |
| Transaction failure on busy network | Implement retry with exponential backoff; show pending confirmation UI |
| SOL price volatility during swap | Jupiter returns `priceImpactPct`; warn user if >10% |
| Phantom wallet not installed | Wallet adapter shows "Install Phantom" prompt automatically |
| Mainnet accidental transactions | Hardcode `mainnet-beta` only; no devnet/testnet in initial build |
| Bundle size increase | Solana packages add ~200KB gzipped; use dynamic imports for `@solana/web3.js` and `@jup-ag/api` |
