export interface NewWeightLogDTO {
  id: string;
  user_id: string;
  weight: number | string;
  date?: string;
  logged_at?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}
