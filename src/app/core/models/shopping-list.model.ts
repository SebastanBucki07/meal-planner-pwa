export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
}

export interface ShoppingList {
  id: number;
  user_id?: string;
  start_date: string;
  end_date: string;
  items: ShoppingListItem[];
  is_completed: boolean;
  created_at?: string;
}

export interface ShoppingListDto {
  id: number;
  user_id?: string;
  start_date: string;
  end_date: string;
  items: ShoppingListItem[] | null;
  is_completed: boolean;
  created_at?: string;
}
