export interface ShoppingListItem {
  id?: string | number;
  name: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
}

export interface ShoppingCategoryGroup {
  categoryName: string;
  items: ShoppingListItem[];
}

export interface ShoppingList {
  id: string | number;
  user_id?: string;
  start_date: string;
  end_date: string;
  items: ShoppingListItem[];
  categories?: ShoppingCategoryGroup[]; // Wyliczane automatycznie przez maper!
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
