/**
 * Volume Profile Plugin
 * Renders a horizontal histogram showing trading volume at each price level.
 * Uses the PluginBase class from the chart-plugins system.
 */

import {
  type DataChangedScope,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type SeriesOptionsMap,
  type Time,
} from "lightweight-charts";
import { PluginBase } from "../plugin-base.ts";

export interface VolumeProfileData {
  time: Time;
  price: number;
  volume: number;
}

export class VolumeProfile extends PluginBase {
  private _data: VolumeProfileData[] = [];

  public setData(data: VolumeProfileData[]): void {
    this._data = data;
    this.requestUpdate();
  }

  public clearData(): void {
    this._data = [];
    this.requestUpdate();
  }

  // ISeriesPrimitive<Time> implementation

  public priceToCoordinate(price: number, range: { min: number; max: number }): number {
    const chart = this.chart;
    const priceScale = chart.priceScale("right");
    if (!priceScale) return 0;
    return priceScale.priceToCoordinate(price);
  }

  public timeToCoordinate(time: Time, range: { from: number; to: number }): number {
    const chart = this.chart;
    const axis = chart.axis("bottom");
    if (!axis) return 0;
    return axis.timeToCoordinate(time);
  }

  public draw(ctx: CanvasRenderingContext2D, area: { width: number; height: number }, pixelRatio: number): void {
    if (this._data.length === 0) return;

    const chart = this.chart;
    const priceScale = chart.priceScale("right");
    if (!priceScale) return;

    const maxVolume = Math.max(...this._data.map((d) => d.volume), 1);

    for (const point of this._data) {
      const y = priceScale.priceToCoordinate(point.price);
      if (y === null || y === undefined) continue;

      const barWidth = Math.max(2, (area.width * point.volume) / maxVolume);
      const x = area.width - barWidth;

      ctx.fillStyle = "rgba(120, 140, 180, 0.35)";
      ctx.fillRect(x, y - 1, barWidth, 2);
    }
  }

  public dataUpdated?(scope: DataChangedScope): void {
    // Re-render when data changes
  }
}
