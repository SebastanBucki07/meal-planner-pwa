import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { ProfileService } from '../../core/services/profile.service';
import { DailyBalanceComponent } from './daily-balance/daily-balance.component';
import { WeightChartComponent } from './weight-chart/weight-chart.component';
import { TodayMealsComponent } from './today-meals/today-meals.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DailyBalanceComponent, WeightChartComponent, TodayMealsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public dashboardService = inject(DashboardService);
  private profileService = inject(ProfileService);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.profileService.loadProfile(),
      this.dashboardService.loadDashboardData()
    ]);
  }
}
