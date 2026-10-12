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

  onMealClick(meal: any): void {
    this.mealClicked.emit(meal); // <-- Emitujemy cały obiekt posiłku!
  }
}
