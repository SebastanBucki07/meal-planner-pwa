import { NewProfileDTO, Profile } from '../models';

export class ProfileMapper {
  static toDomain(dto: NewProfileDTO, latestWeight?: number): Profile {
    return {
      id: dto.id,
      displayName: dto.display_name || 'Użytkownik',
      height: dto.height || undefined,
      weight: latestWeight,
      targets: {
        calories: dto.target_calories || 2000,
        protein: dto.target_protein || 150,
        carbs: dto.target_carbs || 200,
        fat: dto.target_fat || 65
      }
    };
  }

  static toDTO(domain: Profile): Partial<NewProfileDTO> {
    return {
      id: domain.id,
      display_name: domain.displayName,
      height: domain.height || null,
      target_calories: domain.targets.calories,
      target_protein: domain.targets.protein,
      target_carbs: domain.targets.carbs,
      target_fat: domain.targets.fat,
      updated_at: new Date().toISOString()
    };
  }
}
