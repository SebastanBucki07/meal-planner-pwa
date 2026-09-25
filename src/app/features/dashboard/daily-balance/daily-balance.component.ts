import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import {MacroSummaryComponent} from '../../../shared/components/macro-summary/macro-summary.component';

@Component({
  selector: 'app-daily-balance',
  standalone: true,
  imports: [CommonModule, MacroSummaryComponent, MacroSummaryComponent],
  templateUrl: 'daily-balance.component.html',
  styleUrl: './daily-balance.component.scss'
})
export class DailyBalanceComponent {
  private dashboardService = inject(DashboardService);
  private profileService = inject(ProfileService);

  consumed = computed(() => this.dashboardService.todaySummary());
  targets = computed(() => this.profileService.profile()?.targets || {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65
  });
}
