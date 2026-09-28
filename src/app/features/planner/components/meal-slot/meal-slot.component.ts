import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealPlan, MealType } from '../../../../core/models';

@Component({
  selector: 'app-meal-slot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meal-slot.component.html',
  styleUrl: './meal-slot.component.scss'
})
export class MealSlotComponent {
  mealType = input.required<MealType>();
  meals = input.required<MealPlan[]>();

  mealClicked = output<string | null | undefined>();
  addMealClicked = output<MealType>();
  removeMeal = output<string>();

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const sibling = img.nextElementSibling as HTMLElement;
    if (sibling) {
      sibling.style.display = 'flex';
    }
  }

  onMealClick(meal: MealPlan): void {
    console.log('Kliknięty posiłek:', meal);

    // Sprawdzamy wszystkie możliwe ścieżki do ID przepisu
    const recipeId = meal.recipe?.id || meal.recipeId || (meal as any).recipe_id;
    console.log('Wyciągnięte recipeId:', recipeId);

    if (recipeId) {
      this.mealClicked.emit(recipeId);
    } else {
      console.warn('Ten posiłek nie posiada powiązanego przepisu (np. posiłek własny).');
    }
  }
}
