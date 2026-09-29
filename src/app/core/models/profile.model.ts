import { MacroNutrients } from './macro-nutrients.model';

export interface NewProfileDTO {
  id: string;
  display_name: string | null;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  height: number | null;
  age?: number | null;
  gender?: 'male' | 'female' | null;
  work_type?: 'sedentary' | 'physical' | null;
  workouts_per_week?: number | null;
  goal?: 'lose' | 'maintain' | 'gain' | null;
  updated_at?: string;
}

export interface Profile {
  id: string;
  displayName: string;
  targets: MacroNutrients;
  height?: number;
  weight?: number; // Pobierane z najnowszego wpisu w new_weight_logs
  age?: number;
  gender?: 'male' | 'female';
  workType?: 'sedentary' | 'physical';
  workoutsPerWeek?: number;
  goal?: 'lose' | 'maintain' | 'gain';
}
