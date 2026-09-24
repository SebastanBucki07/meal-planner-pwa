import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../core/services/dashboard.service';

interface WeightPoint {
  x: number;
  y: number;
  weight: number;
  date: string;
}

@Component({
  selector: 'app-weight-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weight-chart.component.html',
  styleUrls: ['./weight-chart.component.scss']
})
export class WeightChartComponent {
  public dashboardService = inject(DashboardService);

  selectedPoint = signal<WeightPoint | null>(null);
  isEditingWeight = false;
  weightInput: number | null = null;

  chartData = computed(() => {
    const logs = this.dashboardService.weightHistory();
    if (!logs || logs.length === 0) return null;

    const minLog = logs.reduce((min, item) => (item.weight < min.weight ? item : min), logs[0]);
    const maxLog = logs.reduce((max, item) => (item.weight > max.weight ? item : max), logs[0]);

    const recentLogs = logs.slice(-5);
    const weights = recentLogs.map(l => l.weight);
    const minChartWeight = Math.floor(Math.min(...weights) - 2);
    const maxChartWeight = Math.ceil(Math.max(...weights) + 2);
    const range = maxChartWeight - minChartWeight || 1;

    const width = 500;
    const height = 220;
    const padding = 35;

    const points: WeightPoint[] = recentLogs.map((log, index) => {
      const x =
        recentLogs.length === 1
          ? width / 2
          : padding + (index / (recentLogs.length - 1)) * (width - 2 * padding);

      const y = height - padding - ((log.weight - minChartWeight) / range) * (height - 2 * padding);

      return { x, y, weight: log.weight, date: log.date };
    });

    // Generowanie gładkiej linii Béziera (Smooth Curve)
    const linePath = this.getSmoothPath(points);

    // Ścieżka wypełnienia gradientem (od spodu wykresu do linii)
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${height - 30} L ${points[0].x} ${height - 30} Z`
        : '';

    const latestWeight = recentLogs[recentLogs.length - 1]?.weight;
    const firstWeight = recentLogs[0]?.weight;
    const weightChange = Number((latestWeight - firstWeight).toFixed(1));

    return {
      points,
      linePath,
      areaPath,
      width,
      height,
      latestWeight,
      firstWeight,
      weightChange,
      minWeight: { weight: minLog.weight, date: minLog.date },
      maxWeight: { weight: maxLog.weight, date: maxLog.date }
    };
  });

  /**
   * Algorytm generujący gładką linię SVG (Smooth Bezier Curve) przechodzącą przez punkty
   */
  private getSmoothPath(points: WeightPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x} ${point.y}`;

      // Punkty kontrolne do wygładzenia łuku
      const cpsX = (a[i - 1].x + point.x) / 2;
      return `${acc} C ${cpsX} ${a[i - 1].y}, ${cpsX} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  }

  selectPoint(point: WeightPoint): void {
    this.selectedPoint.set(point);
  }

  async onSaveWeight(): Promise<void> {
    if (!this.weightInput || this.weightInput <= 0) return;
    const success = await this.dashboardService.logWeight(this.weightInput);
    if (success) {
      this.weightInput = null;
      this.isEditingWeight = false;
    }
  }
}
