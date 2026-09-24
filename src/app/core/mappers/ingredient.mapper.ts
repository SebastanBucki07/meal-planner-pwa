import {
  Ingredient,
  RecipeIngredient,
  NewIngredientDTO,
  NewRecipeIngredientDTO
} from '../models/';

export class IngredientMapper {
  /**
   * Mapuje surowy DTO składnika na czysty model domeny Ingredient
   */
  static toDomain(dto: NewIngredientDTO): Ingredient {
    return {
      id: dto.id,
      name: dto.name,
      defaultUnit: dto.default_unit,
      macrosPer100g: {
        calories: dto.calories_per_100g,
        protein: dto.protein_per_100g,
        carbs: dto.carbs_per_100g,
        fat: dto.fat_per_100g
      }
    };
  }

  /**
   * Mapuje relację składnika w przepisie (razem z danymi z zjoinowanej tabeli składników) na RecipeIngredient
   */
  static toRecipeIngredientDomain(dto: NewRecipeIngredientDTO): RecipeIngredient {
    const ingredientData = dto.new_ingredients;
    const amount = dto.amount_in_grams || 0;
    const ratio = amount / 100;

    // Przeliczenie makr proporcjonalnie do gramatury w przepisie
    const calories = ingredientData ? Math.round(ingredientData.calories_per_100g * ratio) : 0;
    const protein = ingredientData ? Number((ingredientData.protein_per_100g * ratio).toFixed(1)) : 0;
    const carbs = ingredientData ? Number((ingredientData.carbs_per_100g * ratio).toFixed(1)) : 0;
    const fat = ingredientData ? Number((ingredientData.fat_per_100g * ratio).toFixed(1)) : 0;

    return {
      id: dto.id,
      ingredientId: dto.ingredient_id,
      name: ingredientData?.name || 'Składnik',
      amountInGrams: amount,
      macros: {
        calories,
        protein,
        carbs,
        fat
      }
    };
  }

  /**
   * Mapuje model domeny Ingredient na DTO do zapisu w bazie
   */
  static toDTO(ingredient: Ingredient): Partial<NewIngredientDTO> {
    return {
      id: ingredient.id,
      name: ingredient.name,
      default_unit: ingredient.defaultUnit,
      calories_per_100g: ingredient.macrosPer100g.calories,
      protein_per_100g: ingredient.macrosPer100g.protein,
      carbs_per_100g: ingredient.macrosPer100g.carbs,
      fat_per_100g: ingredient.macrosPer100g.fat
    };
  }
}
