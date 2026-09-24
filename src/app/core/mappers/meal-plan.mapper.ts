import { MealEntry, NewMealPlanDTO } from '../models';

export class MealPlanMapper {
  static toDomain(dto: NewMealPlanDTO): MealEntry {
    const recipe = dto.new_recipes;
    const servings = dto.servings || 1;

    return {
      id: dto.id,
      date: dto.date,
      mealType: dto.meal_type,
      recipeId: dto.recipe_id || undefined,
      title: recipe ? recipe.title : dto.custom_name || 'Posiłek',
      imageUrl: recipe?.image_url || undefined,
      servings,
      completed: dto.completed,
      calories: Math.round((recipe ? recipe.calories : dto.calories) * servings),
      protein: Math.round((recipe ? recipe.protein : dto.protein) * servings),
      carbs: Math.round((recipe ? recipe.carbs : dto.carbs) * servings),
      fat: Math.round((recipe ? recipe.fat : dto.fat) * servings)
    };
  }
}
