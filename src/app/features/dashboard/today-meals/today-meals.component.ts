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

  // Stany wybranego przepisu oraz ID posiłku z planu
  selectedRecipeId = signal<string | null>(null);
  selectedMealPlanId = signal<string | null>(null); // <-- DODANE

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

  // Przyjmujemy cały obiekt meal, aby wyciągnąć recipeId oraz id planu
  openRecipeModal(meal: any): void {
    const recipeId = meal.recipeId || meal.recipe?.id;
    if (recipeId) {
      this.selectedRecipeId.set(recipeId);
      this.selectedMealPlanId.set(meal.id); // <-- Zapisujemy ID wpisu z new_meal_plans
    }
  }

  closeRecipeModal(): void {
    this.selectedRecipeId.set(null);
    this.selectedMealPlanId.set(null); // <-- Czyszczenie
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
