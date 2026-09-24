import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-today-meals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './today-meals.component.html',
  styleUrls: ['./today-meals.component.scss']
})
export class TodayMealsComponent {
  public dashboardService = inject(DashboardService);

  async toggleMeal(mealId: string, completed: boolean): Promise<void> {
    await this.dashboardService.toggleMealCompleted(mealId, !completed);
  }
}
