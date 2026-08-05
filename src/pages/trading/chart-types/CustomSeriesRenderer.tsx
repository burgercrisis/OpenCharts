// ── CustomSeriesRenderer ──────────────────────────────────────────
// Custom series renderer for non-standard chart types (Renko, Kagi,
// Range, Point & Figure) using the lightweight-charts ISeriesPrimitive
// interface and fancy-canvas for drawing.

import type {
  ISeriesPrimitive,
  ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";
import type { BrickData } from "./types.ts";

// ── Pane View ──────────────────────────────────────────────────────

export class BrickPaneView implements ISeriesPrimitivePaneView {
  private _bricks: BrickData[] = [];
  private _brickSize: number = 1;

  update(data: BrickData[], brickSize: number): void {
    this._bricks = data;
    this._brickSize = brickSize;
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return new BrickRenderer(this._bricks, this._brickSize);
  }

  // Required by ISeriesPrimitivePaneView — return price range for auto-scaling
  priceValueBuilder(_plotRow: unknown): number[] {
    // We handle auto-scaling via the priceMin/priceMax returned by useChartTypeData
    return [];
  }
}

// ── Pane Renderer ──────────────────────────────────────────────────

class BrickRenderer implements ISeriesPrimitivePaneRenderer {
  private _bricks: BrickData[];
  private _brickSize: number;

  constructor(bricks: BrickData[], brickSize: number) {
    this._bricks = bricks;
    this._brickSize = brickSize;
  }

  draw(
    target: CanvasRenderingTarget2D,
    priceConverter: { priceToCoordinate: (price: number) => number },
    isHovered: boolean,
    hitTestData: unknown,
  ): void {
    target.useBitmapCoordinateSpace((scope) => {
      const ctx = scope.context;
      const isDark = scope.isDark;

      const upColor = isDark ? "#0ecb81" : "#0ecb81";
      const downColor = isDark ? "#f6465d" : "#f6465d";
      const upFill = isDark ? "rgba(14, 203, 129, 0.3)" : "rgba(14, 203, 129, 0.2)";
      const downFill = isDark ? "rgba(246, 70, 93, 0.3)" : "rgba(246, 70, 93, 0.2)";

      for (const brick of this._bricks) {
        const y = priceConverter(brick.price);
        const brickHeight = Math.max(
          1,
          Math.abs(priceConverter(brick.price - this._brickSize) - y),
        );

        // Skip bricks that are outside the visible area
        if (y < -brickHeight * 2 || y > scope.height + brickHeight * 2) {
          continue;
        }

        const x = scope.coordinateToX(brick.time as unknown as number);
        const brickWidth = Math.max(2, (scope.width / (this._bricks.length || 1)) * 0.7);

        ctx.fillStyle = brick.direction === "up" ? upFill : downFill;
        ctx.strokeStyle = brick.direction === "up" ? upColor : downColor;
        ctx.lineWidth = 1;

        // Draw the brick as a rectangle
        ctx.fillRect(x - brickWidth / 2, y - brickHeight, brickWidth, brickHeight);
        ctx.strokeRect(x - brickWidth / 2, y - brickHeight, brickWidth, brickHeight);

        // For Kagi shoulder connectors, draw a horizontal line
        if (brick.isShoulder && brick.shoulderPrice !== undefined) {
          const shoulderY = priceConverter(brick.shoulderPrice);
          ctx.beginPath();
          ctx.strokeStyle = brick.direction === "up" ? upColor : downColor;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.moveTo(x - brickWidth / 2, shoulderY);
          ctx.lineTo(x + brickWidth / 2, shoulderY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // For Point & Figure, draw X or O mark
        if (brick.mark === "X") {
          ctx.fillStyle = upColor;
          ctx.font = `${Math.max(8, brickWidth * 0.6)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("X", x, y - brickHeight / 2);
        } else if (brick.mark === "O") {
          ctx.fillStyle = downColor;
          ctx.font = `${Math.max(8, brickWidth * 0.6)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("O", x, y - brickHeight / 2);
        }
      }
    });
  }

  // Hit testing for drawing tools
  hitTest(
    _x: number,
    _y: number,
    _priceConverter: { priceToCoordinate: (price: number) => number },
  ): unknown {
    return null;
  }
}

// ── Factory ────────────────────────────────────────────────────────

export function createBrickPaneView(): BrickPaneView {
  return new BrickPaneView();
}
