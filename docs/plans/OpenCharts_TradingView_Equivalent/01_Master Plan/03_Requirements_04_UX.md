# Requirements: TradingView-like UX

## R14: Keyboard Shortcuts

The platform must support TradingView-style keyboard shortcuts.

### Acceptance Criteria
- `K` toggles indicator menu
- `G` toggles grid
- `V` toggles volume series
- `+` / `-` zooms in/out
- `0` fits content to screen
- `Space` pauses/resumes live updates
- `Esc` closes dialogs / deselects drawings
- Shortcuts do not fire when focus is on an input element
- Shortcut hints are shown in the toolbar

### Technical Requirements
- `useEffect` in `ChartPanel.tsx` registers `keydown` listener on `document`
- Checks `e.target instanceof HTMLInputElement` to skip input fields
- Shortcut hints already exist in `DrawingToolsDropdown`; extend to chart-level shortcuts

## R15: Chart Layout Options

Users must be able to toggle fullscreen mode and panel visibility.

### Acceptance Criteria
- Fullscreen toggle expands chart to viewport
- Panel visibility can be toggled (right panel, bottom panel)
- Layout preferences are persisted
- Fullscreen exit restores normal layout

### Technical Requirements
- `layoutMode` in `useChartPreferences`: `"normal" | "fullscreen" | "panel-only"`
- Fullscreen uses CSS `position: fixed; inset: 0; z-index: 50`
- Panel toggles control CSS display of right panel and bottom panel
- No chart recreation needed for layout changes

## R16: Enhanced Context Menu

Right-click on the chart must show a context menu with TradingView-style options.

### Acceptance Criteria
- "Add Indicator" submenu lists all available indicators
- "Chart Type" submenu lists all chart types
- "Zoom" submenu has Zoom In, Zoom Out, Fit Content, Reset
- "Go to" submenu has Previous bar, Next bar, Start, End
- Existing "Quick Order" and drawing tool options are preserved

### Technical Requirements
- Enhance existing `ChartContextMenu.tsx`
- Add submenu components for each category
- Submenus open on hover (matching TradingView behavior)

## R17: Multi-Chart Grid Layout

Users must be able to view multiple charts in a grid layout.

### Acceptance Criteria
- Presets: 1x1, 1x2, 2x1, 2x2, 2x3, 3x2
- Each sub-chart has independent scroll/zoom
- Sub-charts share symbol/timeframe/indicator state by default
- Layout preference is persisted
- Resize handles between grid cells

### Technical Requirements
- `MultiChartLayout.tsx` uses CSS Grid (`grid-template-columns` / `grid-template-rows`)
- Each cell renders a `ChartPanel` instance
- Parent manages grid configuration and passes shared data down
- Layout selector in toolbar (like TradingView's "Layout" button)

## R18: Watchlist Price Alerts

Users must be able to set price alerts on watchlist items.

### Acceptance Criteria
- Each watchlist item has an alert threshold field
- When price crosses the threshold, a toast notification is shown
- Alert persistence via localStorage or API
- Alert management UI in the watchlist panel

### Technical Requirements
- Reuse existing `DrawingLine.alertEnabled` / `alertMessage` pattern from `line-alerts.ts`
- `WatchlistPanel.tsx` enhanced with alert input per item
- Alert checking runs on each tick update in `useTradingStore`
