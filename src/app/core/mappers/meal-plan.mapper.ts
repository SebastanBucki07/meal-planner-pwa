import { RecipeMapper } from './recipe.mapper';
import {MealPlan, NewMealPlanDTO} from '../models';

export class MealPlanMapper {
  static toDomain(dto: NewMealPlanDTO): MealPlan {
    return {
      id: dto.id,
      userId: dto.user_id,
      date: dto.date,
      mealType: dto.meal_type,
      recipeId: dto.recipe_id,
      recipe: dto.new_recipes ? RecipeMapper.toDomain(dto.new_recipes) : undefined,
      customName: dto.custom_name,
      calories: Number(dto.calories ?? 0),
      protein: Number(dto.protein ?? 0),
      carbs: Number(dto.carbs ?? 0),
      fat: Number(dto.fat ?? 0),
      servings: Number(dto.servings ?? 1),
      completed: Boolean(dto.completed)
    };
  }

  static toDomainList(dtos: NewMealPlanDTO[]): MealPlan[] {
    return dtos.map(dto => MealPlanMapper.toDomain(dto));
  }

  static toInsertDto(plan: Partial<MealPlan>): Partial<NewMealPlanDTO> {
    return {
      date: plan.date,
      meal_type: plan.mealType,
      recipe_id: plan.recipeId || null,
      custom_name: plan.customName || null,
      calories: plan.calories ?? 0,
      protein: plan.protein ?? 0,
      carbs: plan.carbs ?? 0,
      fat: plan.fat ?? 0,
      servings: plan.servings ?? 1,
      completed: plan.completed ?? false
    };
  }
}
