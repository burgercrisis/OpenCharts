# Phase 3: Solana Trading Integration

## Overview
Add Solana blockchain trading capability with wallet connection, DEX swaps, and token balance display.

## Steps

### 3.1 Setup
1. Add Solana packages to `package.json` and install
2. Create `src/services/solana/types.ts` — type definitions
3. Create `src/services/solana/connection.ts` — `SolanaConnectionManager`
4. Create `src/services/solana/wallet.ts` — `useSolanaWallet()` hook + `SolanaProvider`
5. Create `src/services/solana/jupiter.ts` — `JupiterAggregator` class
6. Create `src/services/solana/tokens.ts` — SPL token operations
7. Create `src/services/solana/utils.ts` — address validation, slippage, helpers
8. Test: each service module works in isolation (unit tests)

### 3.2 State Management
9. Modify `src/services/store.tsx` — add `solanaWallet` slice to `TradingState`
10. Modify `src/services/api.ts` — extend Proxy for Solana API methods
11. Modify `src/services/ws.ts` — extend `DemoWsClient` for Solana event channels
12. Test: wallet state integrates with existing trading store

### 3.3 UI Components
13. Create `src/components/solana/WalletConnectButton.tsx`
14. Create `src/components/solana/SwapForm.tsx`
15. Create `src/components/solana/SolanaBalance.tsx`
16. Create `src/components/solana/SolanaConnectionStatus.tsx`
17. Modify `App.tsx` — add `SolanaProvider` wrapper
18. Modify `OrderPanel.tsx` — Solana mode switching
19. Test: wallet connection flow, swap form, balance display

### 3.4 Integration
20. Wire Solana components into `TradingPage.tsx` right panel
21. Test: end-to-end swap flow (connect wallet → select tokens → review → sign → confirm)
22. Security review: address validation, slippage protection, no private keys in client

## Verification
- `npm run typecheck` passes
- `npm run dev` — manual verification of wallet connection + swap flow
- Security review completed
