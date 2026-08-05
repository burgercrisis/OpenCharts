# Requirements: Solana Trading

## R10: Wallet Connection

Users must be able to connect Solana wallets to trade on-chain.

### Acceptance Criteria
- Wallet connection button in the top bar (next to ConnectionIndicator)
- Supports Phantom, Solflare, and Backpack wallets
- Connection state is persisted across page reloads
- Wallet address is displayed when connected
- Disconnect option available
- No wallet → paper trading mode (existing behavior preserved)

### Technical Requirements
- `@solana/wallet-adapter-react` provides `useWallet()` hook
- `SolanaProvider` wraps the app in `App.tsx`
- `useSolanaWallet()` hook mirrors the `wsClient` singleton pattern
- Wallet state stored in `useTradingStore` under `solanaWallet` slice
- `SolanaConnectionStatus.tsx` shows connection state (connected/disconnected/error)

## R11: DEX Swap Integration

Users must be able to swap SPL tokens on Solana via Jupiter Aggregator.

### Acceptance Criteria
- Swap form allows selecting input/output tokens
- Jupiter route discovery shows expected output and price impact
- Transaction is signed by the connected wallet
- Transaction is broadcast to Solana mainnet-beta
- Success/failure feedback is shown to the user
- Slippage is configurable (default 500 bps, max 50%)

### Technical Requirements
- `@jup-ag/api` for route discovery and transaction building
- `JupiterAggregator.findRoutes()` → `findBestRoute()` → `buildAndSendTransaction()`
- `wallet.signTransaction()` signs the transaction
- `connection.sendRawTransaction()` broadcasts
- `SwapForm.tsx` follows `OrderPanel.tsx` layout pattern
- Price impact warnings shown when >10%

## R12: Token Balance Display

Users must see their SOL and SPL token balances.

### Acceptance Criteria
- Balance is fetched and displayed when wallet is connected
- Supports SOL (native) and SPL tokens
- Balance updates when transactions are confirmed
- Token list includes major Solana tokens (USDC, USDT, RAY, SRM, etc.)

### Technical Requirements
- `@solana/web3.js` `Connection.getBalance()` for SOL balance
- `@solana/spl-token` `getAccount()` for SPL token balances
- Token metadata fetched from SPL token list
- `SolanaBalance.tsx` component displays balances

## R13: Security

All Solana trading must follow security best practices.

### Acceptance Criteria
- Addresses are validated via `new PublicKey()` before any transaction
- Private keys never leave the wallet adapter
- Only mainnet-beta is supported (no devnet in production)
- Slippage protection is enforced by default
- Price impact warnings are shown for large trades
- Transaction confirmation is required before broadcasting

### Technical Requirements
- All Solana service functions are React-free (testable in isolation)
- No private key handling in client code
- `signTransaction` is exclusively handled by the wallet adapter
- Transaction simulation can be optionally used before signing
