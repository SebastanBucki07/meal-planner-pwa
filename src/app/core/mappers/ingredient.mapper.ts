import { Ingredient, INGREDIENT_CATEGORIES } from '../models/';

export interface NewIngredientDTO {
  id?: string;
  name: string;
  category_id?: number | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  default_unit_id?: string | null;
}

export class IngredientMapper {
  static toDomain(dto: NewIngredientDTO): Ingredient {
    const validCatIds = INGREDIENT_CATEGORIES.map(c => c.id);
    const categoryId =
      dto.category_id && validCatIds.includes(dto.category_id) ? dto.category_id : 10;

    return {
      id: dto.id || '',
      name: dto.name,
      categoryId,
      defaultUnitId: dto.default_unit_id || '', // UUID jednostki
      macrosPer100g: {
        calories: dto.calories_per_100g || 0,
        protein: dto.protein_per_100g || 0,
        carbs: dto.carbs_per_100g || 0,
        fat: dto.fat_per_100g || 0
      }
    };
  }

  static toDTO(domain: Ingredient): NewIngredientDTO {
    return {
      id: domain.id || undefined,
      name: domain.name,
      category_id: domain.categoryId,
      calories_per_100g: domain.macrosPer100g.calories,
      protein_per_100g: domain.macrosPer100g.protein,
      carbs_per_100g: domain.macrosPer100g.carbs,
      fat_per_100g: domain.macrosPer100g.fat,
      default_unit_id: domain.defaultUnitId || null // Zapisujemy UUID do kolumny w bazie
    };
  }
}
