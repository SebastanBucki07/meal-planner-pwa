import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../core/services/dashboard.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public dashboardService = inject(DashboardService);
  public profileService = inject(ProfileService);

  // Stan formularza wagi
  isEditingWeight: boolean = false;
  weightInput: number | null = null;

  // Wyliczanie postępu makroskładników na podstawie celów i spożycia
  progress = computed(() => {
    const consumed = this.dashboardService.todaySummary();
    const targets = this.profileService.profile()?.targets || {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65
    };

    return {
      caloriesPct: Math.min(100, Math.round(((consumed.calories || 0) / targets.calories) * 100)),
      proteinPct: Math.min(100, Math.round(((consumed.protein || 0) / targets.protein) * 100)),
      carbsPct: Math.min(100, Math.round(((consumed.carbs || 0) / targets.carbs) * 100)),
      fatPct: Math.min(100, Math.round(((consumed.fat || 0) / targets.fat) * 100)),
      targets,
      consumed
    };
  });

  // Generowanie punktów dla wykresu SVG wagi
  chartData = computed(() => {
    const logs = this.dashboardService.weightHistory();
    if (!logs || logs.length === 0) return null;

    const weights = logs.map(l => l.weight);
    const minWeight = Math.floor(Math.min(...weights) - 1);
    const maxWeight = Math.ceil(Math.max(...weights) + 1);
    const range = maxWeight - minWeight || 1;

    const width = 500;
    const height = 200;
    const padding = 30;

    const points = logs.map((log, index) => {
      const x = padding + (index / Math.max(logs.length - 1, 1)) * (width - 2 * padding);
      const y = height - padding - ((log.weight - minWeight) / range) * (height - 2 * padding);
      return { x, y, weight: log.weight, date: log.date };
    });

    const svgPath = points.reduce(
      (acc, point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`),
      ''
    );

    return { points, svgPath, minWeight, maxWeight, width, height };
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.profileService.loadProfile(),
      this.dashboardService.loadDashboardData()
    ]);
  }

  // Akcje wagi
  async onSaveWeight(): Promise<void> {
    if (!this.weightInput || this.weightInput <= 0) return;
    const success = await this.dashboardService.logWeight(this.weightInput);
    if (success) {
      this.weightInput = null;
      this.isEditingWeight = false;
    }
  }

  // Akcje posiłków
  async toggleMeal(mealId: string, completed: boolean): Promise<void> {
    await this.dashboardService.toggleMealCompleted(mealId, !completed);
  }
}
