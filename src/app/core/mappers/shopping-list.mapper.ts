import {
  ShoppingList,
  ShoppingListDto,
  ShoppingListItem,
  ShoppingCategoryGroup
} from '../models/shopping-list.model';

export class ShoppingListMapper {
  static toDomain(dto: ShoppingListDto): ShoppingList {
    const items: ShoppingListItem[] = dto.items || [];

    // Grupowanie płaskiej listy items według kategorii
    const categoryMap = new Map<string, ShoppingListItem[]>();

    items.forEach(item => {
      const catName = item.category || 'Inne';
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, []);
      }
      categoryMap.get(catName)!.push(item);
    });

    const categories: ShoppingCategoryGroup[] = Array.from(categoryMap.entries()).map(
      ([categoryName, groupItems]) => ({
        categoryName,
        items: groupItems
      })
    );

    return {
      id: dto.id,
      user_id: dto.user_id || undefined,
      start_date: dto.start_date,
      end_date: dto.end_date,
      items,
      categories, // Gotowe do wyświetlenia w widoku!
      is_completed: dto.is_completed || false,
      created_at: dto.created_at
    };
  }

  static toDomainList(dtos: ShoppingListDto[]): ShoppingList[] {
    return dtos.map(dto => ShoppingListMapper.toDomain(dto));
  }
}
