import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';

export type MealType = 'Śniadanie' | 'II Śniadanie' | 'Obiad' | 'Kolacja' | 'Przekąska';

@Component({
  selector: 'app-today-meals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './today-meals.component.html',
  styleUrls: ['./today-meals.component.scss']
})
export class TodayMealsComponent {
  public dashboardService = inject(DashboardService);

  readonly mealTypes: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'];

  groupedMeals = computed(() => {
    const meals = this.dashboardService.todayMeals();

    return this.mealTypes
    .map(type => ({
      type,
      meals: meals.filter(m => m.mealType === type)
    }))
    .filter(group => group.meals.length > 0);
  });

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const sibling = img.nextElementSibling as HTMLElement;
    if (sibling) {
      sibling.style.display = 'flex';
    }
  }
}
