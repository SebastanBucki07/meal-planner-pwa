import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Recipe, MealType } from '../../../../core/models';

export interface RecipeSelectionResult {
  recipeId: string;
  servings: number;
}

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

  recipeSelected = output<RecipeSelectionResult>();
  closeModal = output<void>();

  searchQuery = signal<string>('');
  filterMaxKcal = signal<number | null>(null);
  filterMinProtein = signal<number | null>(null);
  filterMinCarbs = signal<number | null>(null);
  filterMinFat = signal<number | null>(null);

  selectedServingsMap = signal<Map<string, number>>(new Map());

  getServings(recipe: Recipe): number {
    const map = this.selectedServingsMap();
    if (!map.has(recipe.id)) {
      map.set(recipe.id, recipe.servings || 1);
    }
    return map.get(recipe.id)!;
  }

  updateServings(recipe: Recipe, delta: number, event: Event): void {
    event.stopPropagation();
    const current = this.getServings(recipe);
    const next = current + delta;
    if (next >= 1) {
      const map = new Map(this.selectedServingsMap());
      map.set(recipe.id, next);
      this.selectedServingsMap.set(map);
    }
  }

  getScaledCalories(recipe: Recipe): number {
    const base = recipe.calories || 0;
    const s = this.getServings(recipe);
    const baseServings = recipe.servings || 1;
    return Math.round((base / baseServings) * s);
  }

  getScaledProtein(recipe: Recipe): number {
    const base = recipe.protein || 0;
    const s = this.getServings(recipe);
    const baseServings = recipe.servings || 1;
    return Number(((base / baseServings) * s).toFixed(1));
  }

  getScaledCarbs(recipe: Recipe): number {
    const base = recipe.carbs || 0;
    const s = this.getServings(recipe);
    const baseServings = recipe.servings || 1;
    return Number(((base / baseServings) * s).toFixed(1));
  }

  getScaledFat(recipe: Recipe): number {
    const base = recipe.fat || 0;
    const s = this.getServings(recipe);
    const baseServings = recipe.servings || 1;
    return Number(((base / baseServings) * s).toFixed(1));
  }

  selectRecipe(recipe: Recipe): void {
    const servings = this.getServings(recipe);
    this.recipeSelected.emit({
      recipeId: recipe.id,
      servings: servings
    });
  }

  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const maxKcal = this.filterMaxKcal();
    const minProtein = this.filterMinProtein();
    const minCarbs = this.filterMinCarbs();
    const minFat = this.filterMinFat();

    return this.availableRecipes().filter(r => {
      const matchesQuery = !query || r.title.toLowerCase().includes(query);
      const currentKcal = this.getScaledCalories(r);
      const matchesKcal = maxKcal === null || maxKcal === undefined || currentKcal <= maxKcal;
      const matchesProtein =
        minProtein === null || minProtein === undefined || r.protein >= minProtein;
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
