import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Recipe, MealType } from '../../../../core/models';

@Component({
  selector: 'app-recipe-select-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recipe-select-modal.component.html',
  styleUrl: './recipe-select-modal.component.scss'
})
export class RecipeSelectModalComponent {
  slotName = input.required<MealType>();
  availableRecipes = input.required<Recipe[]>();

  recipeSelected = output<string>();
  closeModal = output<void>();

  searchQuery = signal<string>('');
  filterMaxKcal = signal<number | null>(null);
  filterMinProtein = signal<number | null>(null);
  filterMinCarbs = signal<number | null>(null);
  filterMinFat = signal<number | null>(null);

  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const maxKcal = this.filterMaxKcal();
    const minProtein = this.filterMinProtein();
    const minCarbs = this.filterMinCarbs();
    const minFat = this.filterMinFat();

    return this.availableRecipes().filter(r => {
      const matchesQuery = !query || r.title.toLowerCase().includes(query);
      const matchesKcal = maxKcal === null || maxKcal === undefined || r.calories <= maxKcal;
      const matchesProtein = minProtein === null || minProtein === undefined || r.protein >= minProtein;
      const matchesCarbs = minCarbs === null || minCarbs === undefined || r.carbs >= minCarbs;
      const matchesFat = minFat === null || minFat === undefined || r.fat >= minFat;

      return matchesQuery && matchesKcal && matchesProtein && matchesCarbs && matchesFat;
    });
  });

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
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
