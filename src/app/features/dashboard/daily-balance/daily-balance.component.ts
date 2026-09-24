import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-daily-balance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-balance.component.html',
  styleUrls: ['./daily-balance.component.scss']
})
export class DailyBalanceComponent {
  private dashboardService = inject(DashboardService);
  private profileService = inject(ProfileService);

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
}
