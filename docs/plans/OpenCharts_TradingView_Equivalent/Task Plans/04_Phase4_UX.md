# Phase 4: TradingView-like UX Improvements

## Overview
Add keyboard shortcuts, layout options, enhanced context menus, multi-chart grid, and watchlist price alerts.

## Steps

### 4.1 Keyboard Shortcuts
1. Add `keydown` listener `useEffect` in `ChartPanel.tsx`
2. Implement shortcuts: K (indicators), G (grid), V (volume), +/- (zoom), 0 (fit), Space (pause), Esc (close)
3. Add shortcut hints to toolbar buttons
4. Test: all shortcuts work, none fire when focus is on input

### 4.2 Layout Options
5. Add `layoutMode` and `panelVisibility` to `useChartPreferences.ts`
6. Add fullscreen toggle button to `ChartToolbar.tsx`
7. Add panel toggle buttons to `ChartToolbar.tsx`
8. Implement fullscreen CSS (position: fixed; inset: 0; z-index: 50)
9. Test: fullscreen toggle, panel visibility toggles, preference persistence

### 4.3 Enhanced Context Menu
10. Enhance `ChartContextMenu.tsx` with "Add Indicator" submenu
11. Add "Chart Type" submenu to context menu
12. Add "Zoom" submenu (Zoom In, Zoom Out, Fit Content, Reset)
13. Add "Go to" submenu (Previous bar, Next bar, Start, End)
14. Test: all context menu items work correctly

### 4.4 Multi-Chart Grid Layout
15. Create `MultiChartLayout.tsx` — CSS Grid with resize handles
16. Add layout configuration to `ChartSettingsDialog.tsx`
17. Add layout selector dropdown to `ChartToolbar.tsx`
18. Test: all layout presets (1x1, 1x2, 2x1, 2x2, 2x3, 3x2) work

### 4.5 Watchlist Price Alerts
19. Add alert threshold field to `WatchlistPanel.tsx`
20. Implement alert checking in `useTradingStore` tick updates
21. Test: alerts fire when price crosses threshold

## Verification
- `npm run typecheck` passes
- `npm run dev` — manual verification of all UX features
