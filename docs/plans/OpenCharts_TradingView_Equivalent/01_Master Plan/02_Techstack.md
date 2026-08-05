# Tech Stack

## Existing (Unchanged)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React 19 | ^19.0.0 |
| Language | TypeScript | ^5.7.0 |
| Build system | Vite 6 | ^6.0.0 |
| Package manager | pnpm | workspace config |
| Testing | Vitest 2 + Testing Library | ^2.1.9 |
| Styling | Tailwind CSS 3 + Radix UI | ^3.4.19 |
| State management | Zustand 5 | ^5.0.0 |
| Data caching | TanStack React Query 5 | ^5.90.21 |
| Chart engine | lightweight-charts 4 | ^4.2.0 |
| Canvas rendering | fancy-canvas 2 | ^2.1.0 |
| PineScript engine | @heyphat/piner | ^0.11.1 |
| Animation | framer-motion 12 | ^12.35.2 |
| Routing | react-router-dom 7 | ^7.1.0 |
| Validation | Zod 3 | ^3.25.76 |
| Icons | lucide-react | ^0.575.0 |

## New Dependencies

| Package | Purpose | Version (latest) |
|---------|---------|-----------------|
| @solana/web3.js | Solana blockchain interaction | ^1.98.2 |
| @solana/wallet-adapter-react | Wallet connection framework | ^0.15.3 |
| @solana/wallet-adapter-react-ui | Wallet UI components | ^0.15.3 |
| @solana/wallet-adapter-wallets | Phantom, Solflare, Backpack adapters | ^0.19.3 |
| @jup-ag/api | Jupiter DEX aggregator | ^1.0.0 |
| @solana/spl-token | SPL token operations | ^0.4.0 |

## Chart Engine Details

### lightweight-charts v4.2.0
- `addCandlestickSeries()` — existing
- `addLineSeries()` — existing (indicators)
- `addHistogramSeries()` — existing (volume, MACD)
- `addAreaSeries()` — new (area chart type)
- `addBarSeries()` — new (bar chart type)
- `addCustomSeries()` — new (Renko, Kagi, Range, P&F)

### Custom Series Pattern
All non-standard chart types use `ISeriesPrimitive<Time>`:
```typescript
interface ISeriesPrimitive<T> {
  priceValueBuilder(plotRow: T): number[];
  renderer(): ISeriesPrimitivePaneRenderer;
}
```

### PineScript Engine (@heyphat/piner)
- `compile(source)` — compiles PineScript v6
- `Engine(compiled, feed, opts)` — runs compiled script
- `ArrayFeed(bars)` — feeds candle data
- `engine.outputs` — extracts plots, markers, candles, hlines, securityRequests
- Backend: `"js"` (client-side execution)

## Solana Integration Stack

### Wallet Layer
```
@solana/wallet-adapter-react
  ├── PhantomWalletAdapter
  ├── SolflareWalletAdapter
  └── BackpackWalletAdapter
```

### DEX Layer
```
@jup-ag/api
  └── JupiterAggregator.findRoutes() → findBestRoute() → buildAndSendTransaction()
```

### Blockchain Layer
```
@solana/web3.js
  ├── Connection (RPC endpoint)
  ├── PublicKey (address validation)
  ├── Transaction (message building)
  └── sendRawTransaction() (broadcast)
```
