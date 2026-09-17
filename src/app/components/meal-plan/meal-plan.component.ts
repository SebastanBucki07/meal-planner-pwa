import {Component} from '@angular/core';
import {SupabaseService} from '../../services/supabase.service';
import {NgForOf, NgIf, TitleCasePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {NavbarComponent} from '../navbar/navbar.component';

@Component({
  selector: 'app-meal-plan',
  imports: [
    TitleCasePipe,
    FormsModule,
    NavbarComponent,
    NgIf,
    NgForOf
  ],
  templateUrl: './meal-plan.component.html',
  styleUrl: './meal-plan.component.scss'
})
export class MealPlanComponent {
  selectedDate: string = new Date().toISOString().split('T')[0];

  meals: any[] = [];
  recipes: any[] = [];
  loading = false;
  showModal = false;

// Formularz dodawania posiłku
  selectedRecipeId = '';
  selectedMealType = 'śniadanie';
  servings = 1;

  mealTypes = ['śniadanie', 'drugie śniadanie', 'obiad', 'kolacja', 'przekąska'];

  constructor(private supabase: SupabaseService) {
  }

  async ngOnInit() {
    await this.loadRecipes();
    await this.loadMeals();
  }

  async onDateChange() {
    await this.loadMeals();
  }

  async loadRecipes() {
    const {data, error} = await this.supabase.getRecipes();
    if (!error && data) {
      this.recipes = data;
      if (this.recipes.length > 0) {
        this.selectedRecipeId = this.recipes[0].id;
      }
    }
  }

  async loadMeals() {
    this.loading = true;
    const {data, error} = await this.supabase.getMealPlan(this.selectedDate);
    if (!error && data) {
      this.meals = data;
    }
    this.loading = false;
  }

  async addMeal() {
    if (!this.selectedRecipeId) return;

    this.loading = true;

    const mealData = {
      date: this.selectedDate, // Format YYYY-MM-DD z input type="date"
      recipe_id: this.selectedRecipeId,
      meal_type: this.selectedMealType,
      servings: Number(this.servings) || 1
    };

    const { error } = await this.supabase.addMealToPlan(mealData);

    if (error) {
      console.error('Błąd dodawania posiłku:', error);
      alert('Nie udało się dodać posiłku: ' + error.message);
    } else {
      this.showModal = false;
      await this.loadMeals();
    }

    this.loading = false;
  }

  async deleteMeal(id: string) {
    const {error} = await this.supabase.deleteMealFromPlan(id);
    if (!error) {
      await this.loadMeals();
    }
  }
}
