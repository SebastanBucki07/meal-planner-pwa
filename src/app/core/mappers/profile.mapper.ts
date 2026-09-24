import { NewProfileDTO, Profile } from '../models';

export class ProfileMapper {
  static toDomain(dto: NewProfileDTO, latestWeight?: number): Profile {
    return {
      id: dto.id,
      displayName: dto.display_name || 'Użytkownik',
      height: dto.height || undefined,
      weight: latestWeight,
      age: dto.age || undefined,
      gender: dto.gender || undefined,
      workType: dto.work_type || undefined,
      workoutsPerWeek: dto.workouts_per_week ?? undefined,
      goal: dto.goal || undefined,
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
      age: domain.age || null,
      gender: domain.gender || null,
      work_type: domain.workType || null,
      workouts_per_week: domain.workoutsPerWeek ?? null,
      goal: domain.goal || null,
      target_calories: domain.targets.calories,
      target_protein: domain.targets.protein,
      target_carbs: domain.targets.carbs,
      target_fat: domain.targets.fat,
      updated_at: new Date().toISOString()
    };
  }
}
