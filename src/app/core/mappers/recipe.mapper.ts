import { NewRecipeDTO, Recipe, RecipeIngredient } from '../models';

export class RecipeMapper {
  static toDomain(dto: NewRecipeDTO & { new_recipe_ingredients?: any[] }): Recipe {
    const mappedIngredients: RecipeIngredient[] = (dto.new_recipe_ingredients || []).map((ri: any) => {
      const ingredientInfo = ri.new_ingredients || {};
      const amount = ri.amount_in_grams || 0;

      const caloriesPer100g = ingredientInfo.calories_per_100g || 0;
      const proteinPer100g = ingredientInfo.protein_per_100g || 0;
      const carbsPer100g = ingredientInfo.carbs_per_100g || 0;
      const fatPer100g = ingredientInfo.fat_per_100g || 0;

      const multiplier = amount / 100;
      const calculatedCalories = Math.round(caloriesPer100g * multiplier);

      return {
        id: ri.id || '',
        ingredientId: ri.ingredient_id || ingredientInfo.id || '',
        amountInGrams: amount,
        name: ingredientInfo.name || 'Składnik',
        unit: 'g',
        calories: calculatedCalories,
        macros: {
          calories: calculatedCalories, // Wymagane przez typ w RecipeIngredient
          protein: Number((proteinPer100g * multiplier).toFixed(1)),
          carbs: Number((carbsPer100g * multiplier).toFixed(1)),
          fat: Number((fatPer100g * multiplier).toFixed(1))
        }
      };
    });

    return {
      id: dto.id,
      title: dto.title,
      description: dto.description || undefined,
      instructions: dto.instructions || undefined,
      imageUrl: dto.image_url || undefined,
      videoUrl: dto.video_url || undefined,
      calories: dto.calories ?? 0,
      protein: Number(dto.protein ?? 0),
      carbs: Number(dto.carbs ?? 0),
      fat: Number(dto.fat ?? 0),
      ingredients: mappedIngredients
    };
  }

  static toDomainList(dtos: NewRecipeDTO[]): Recipe[] {
    return dtos.map(dto => RecipeMapper.toDomain(dto));
  }

  static toInsertDto(formValues: {
    title: string;
    description?: string;
    instructions?: string;
    imageUrl?: string;
    videoUrl?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }): Partial<NewRecipeDTO> {
    return {
      title: formValues.title,
      description: formValues.description || null,
      instructions: formValues.instructions || null,
      image_url: formValues.imageUrl || null,
      video_url: formValues.videoUrl || null,
      calories: formValues.calories,
      protein: formValues.protein,
      carbs: formValues.carbs,
      fat: formValues.fat
    };
  }
}
