export interface IngredientCategory {
  id: string | number; // String jeśli używasz UUID, number jeśli to ID typu serial/integer
  name: string;
  createdAt?: Date | string;
}
