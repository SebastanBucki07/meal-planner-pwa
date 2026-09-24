import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {Recipe} from '../../../core/models';
import {RecipeService} from '../../../core/services/recipe.service';



@Component({
  selector: 'app-recipe-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-details.component.html',
  styleUrl: './recipe-details.component.scss'
})
export class RecipeDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);

  recipe = signal<Recipe | null>(null);
  formattedSteps: string[] = [];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Pobieranie przepisu (zakładając metodę w serwisie lub bezpośrednio z supabase)
      const fetchedRecipe = await this.recipeService.getRecipeById(id);
      if (fetchedRecipe) {
        this.recipe.set(fetchedRecipe);
        this.prepareSteps(fetchedRecipe.instructions);
      }
    }
  }

  private prepareSteps(instructions?: string): void {
    if (!instructions) {
      this.formattedSteps = [];
      return;
    }
    // Oczyszczanie linii i usuwanie prefiksów typu "Krok X:" w TS zamiast w HTML
    this.formattedSteps = instructions
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^Krok\s*\d+:\s*/i, ''));
  }

  // Pomocniczegettery bezpiecznie obsługujące różne warianty pól w RecipeIngredient
  getIngredientName(ing: any): string {
    return ing.name || ing.ingredientName || 'Składnik';
  }

  getIngredientAmount(ing: any): number {
    return ing.amount ?? ing.quantity ?? 0;
  }

  getIngredientUnit(ing: any): string {
    return ing.unit || ing.unitName || '';
  }

  getIngredientCalories(ing: any): number {
    return ing.calories ?? 0;
  }
}
