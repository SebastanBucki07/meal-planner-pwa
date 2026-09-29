import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';
import { RecipeDetailModalComponent } from '../../../shared/components/recipe-detail-modal/recipe-detail-modal.component';

export type MealType = 'Śniadanie' | 'II Śniadanie' | 'Obiad' | 'Kolacja' | 'Przekąska';

@Component({
  selector: 'app-today-meals',
  standalone: true,
  imports: [CommonModule, RecipeDetailModalComponent],
  templateUrl: './today-meals.component.html',
  styleUrls: ['./today-meals.component.scss']
})
export class TodayMealsComponent {
  public dashboardService = inject(DashboardService);

  // Stan wybranego przepisu do wyświetlenia w modalu
  selectedRecipeId = signal<string | null>(null);

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

  // Przełącz typ parametru na: recipeId?: string | null
  openRecipeModal(recipeId?: string | null): void {
    if (recipeId) {
      this.selectedRecipeId.set(recipeId);
    }
  }
  closeRecipeModal(): void {
    this.selectedRecipeId.set(null);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const sibling = img.nextElementSibling as HTMLElement;
    if (sibling) {
      sibling.style.display = 'flex';
    }
  }
}
