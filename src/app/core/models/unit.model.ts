export interface Unit {
  id: string;
  name: string;
  multiplierToGrams: number;
}

export interface UnitDto {
  id: string;
  name: string;
  multiplier_to_grams: number | null;
}
