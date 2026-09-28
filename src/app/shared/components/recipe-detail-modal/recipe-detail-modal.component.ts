import { Component, OnInit, inject, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recipe } from '../../../core/models';
import { RecipeService } from '../../../core/services/recipe.service';

@Component({
  selector: 'app-recipe-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-detail-modal.component.html',
  styleUrls: ['./recipe-detail-modal.component.scss']
})
export class RecipeDetailModalComponent implements OnInit {
  private recipeService = inject(RecipeService);

  // Inputs (usunięto alias z recipeData)
  readonly recipeId = input<string | null>(null);
  readonly recipeData = input<Recipe | null>(null);
  readonly interactiveSteps = input<boolean>(false);

  // Outputs
  readonly closeModal = output<void>();

  // State
  recipe = signal<Recipe | null>(null);
  formattedSteps = signal<string[]>([]);
  completedSteps = signal<Set<number>>(new Set());

  constructor() {
    // Reaguj na zmiany recipeId lub recipeData
    effect(
      () => {
        const directRecipe = this.recipeData();
        const id = this.recipeId();

        if (directRecipe) {
          this.setRecipe(directRecipe);
        } else if (id) {
          this.loadRecipeById(id);
        }
      },
      { allowSignalWrites: true }
    );
  }

  async ngOnInit(): Promise<void> {
    if (this.recipeData()) {
      this.setRecipe(this.recipeData()!);
    } else if (this.recipeId()) {
      await this.loadRecipeById(this.recipeId()!);
    }
  }

  private async loadRecipeById(id: string): Promise<void> {
    const fetched = await this.recipeService.getRecipeById(id);
    if (fetched) {
      this.setRecipe(fetched);
    }
  }

  private setRecipe(recipe: Recipe): void {
    this.recipe.set(recipe);
    this.prepareSteps(recipe.instructions);
  }

  private prepareSteps(instructions?: string): void {
    if (!instructions) {
      this.formattedSteps.set([]);
      return;
    }
    const steps = instructions
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^Krok\s*\d+:\s*/i, ''));

    this.formattedSteps.set(steps);
  }

  toggleStep(index: number): void {
    if (!this.interactiveSteps()) return;

    const current = new Set(this.completedSteps());
    if (current.has(index)) {
      current.delete(index);
    } else {
      current.add(index);
    }
    this.completedSteps.set(current);
  }

  isStepCompleted(index: number): boolean {
    return this.completedSteps().has(index);
  }

  close(): void {
    this.closeModal.emit();
  }

  // Gettery pomocnicze
  getIngredientName(ing: any): string {
    return ing.name || ing.ingredientName || 'Składnik';
  }

  getIngredientAmount(ing: any): number {
    return ing.amount ?? ing.amountInGrams ?? ing.quantity ?? 0;
  }

  getIngredientUnit(ing: any): string {
    return ing.unit || ing.unitName || 'g';
  }

  getIngredientCalories(ing: any): number {
    return ing.calories ?? 0;
  }
}
