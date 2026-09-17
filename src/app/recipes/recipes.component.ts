import { Component } from '@angular/core';
import {SupabaseService} from '../services/supabase.service';
import {FormsModule} from '@angular/forms';
import {NavbarComponent} from '../components/navbar/navbar.component';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-recipes',
  imports: [
    FormsModule,
    NavbarComponent,
    NgIf,
    NgForOf
  ],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent {
  recipes: any[] = [];
  loading = false;
  showModal = false;

  // Formularz nowego przepisu
  title = '';
  calories: number | null = null;
  protein: number | null = null;
  carbs: number | null = null;
  fat: number | null = null;
  instructions = '';

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.loadRecipes();
  }

  async loadRecipes() {
    this.loading = true;
    const { data, error } = await this.supabase.getRecipes();
    if (!error && data) {
      this.recipes = data;
    }
    this.loading = false;
  }

  async createRecipe() {
    if (!this.title || this.calories === null) return;

    this.loading = true;

    const recipeData = {
      title: this.title.trim(),
      calories: Number(this.calories) || 0,
      protein: Number(this.protein) || 0,
      carbs: Number(this.carbs) || 0,
      fat: Number(this.fat) || 0,
      instructions: this.instructions ? this.instructions.trim() : ''
    };

    const { error } = await this.supabase.addRecipe(recipeData);

    if (error) {
      console.error('Błąd dodawania przepisu:', error);
      alert('Nie udało się dodać przepisu: ' + error.message);
    } else {
      this.resetForm();
      this.showModal = false;
      await this.loadRecipes();
    }

    this.loading = false;
  }

  resetForm() {
    this.title = '';
    this.calories = null;
    this.protein = null;
    this.carbs = null;
    this.fat = null;
    this.instructions = '';
  }
}
