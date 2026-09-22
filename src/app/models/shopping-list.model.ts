import { ShoppingListItem } from './shopping-list-item.model';

export interface ShoppingList {
  id: number;
  start_date: string;
  end_date: string;
  items: ShoppingListItem[];
  is_completed: boolean;
}
