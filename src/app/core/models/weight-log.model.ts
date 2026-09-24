// Model DTO dla tabeli `new_weight_logs`
export interface NewWeightLogDTO {
  id: string;
  user_id: string;
  weight: number;
  date: string;
  created_at: string;
}

// Model Domenowy Logu Wagi
export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}
