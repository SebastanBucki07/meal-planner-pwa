import {ShoppingList, ShoppingListDto} from '../models/shopping-list.model';

export class ShoppingListMapper {
  static toDomain(dto: ShoppingListDto): ShoppingList {
    return {
      id: dto.id,
      user_id: dto.user_id || undefined,
      start_date: dto.start_date,
      end_date: dto.end_date,
      items: dto.items || [],
      is_completed: dto.is_completed || false,
      created_at: dto.created_at
    };
  }

  static toDomainList(dtos: ShoppingListDto[]): ShoppingList[] {
    return dtos.map(dto => ShoppingListMapper.toDomain(dto));
  }
}
