import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ShoppingList, ShoppingListItem } from '../../models';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-list.component.html',
  styleUrls: ['./shopping-list.component.scss']
})
export class ShoppingListComponent implements OnInit {
  loading = false;

  historyLists: ShoppingList[] = [];
  activeList: ShoppingList | null = null;
  categories: string[] = [];

  startDate = '';
  endDate = '';

  // Stan zakładki mobilnej: 'list' | 'history'
  activeTab: 'list' | 'history' = 'list';

  constructor(private supabase: SupabaseService) {}

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('shopping_lists')
        .select('*')
        .eq('is_completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.historyLists = data || [];
    } catch (error) {
      console.error('Błąd ładowania historii:', error);
    } finally {
      this.loading = false;
    }
  }

  selectListFromHistory(list: ShoppingList): void {
    this.activeList = list;
    this.updateCategories();
    this.activeTab = 'list'; // Po kliknięciu w historię na mobilce przełącz na widok listy
  }

  async generateShoppingList(): Promise<void> {
    this.loading = true;
    try {
      const generatedItems = await this.calculateItems();
      if (generatedItems.length === 0) {
        alert('Brak zaplanowanych posiłków w wybranym zakresie.');
        this.loading = false;
        return;
      }

      const {
        data: { user }
      } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Użytkownik nie jest zalogowany');

      const { data, error } = await this.supabase.client
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          start_date: this.startDate,
          end_date: this.endDate,
          items: generatedItems,
          is_completed: false
        })
        .select()
        .single();

      if (error) throw error;

      this.activeList = data as ShoppingList;
      await this.loadHistory();
      this.updateCategories();
      this.activeTab = 'list';
    } catch (error) {
      console.error('Błąd generowania listy zakupów:', error);
      alert('Nie udało się wygenerować listy zakupów.');
    } finally {
      this.loading = false;
    }
  }

  async onItemCheck(): Promise<void> {
    if (!this.activeList) return;

    const allChecked = this.activeList.items.every(item => item.checked);
    if (allChecked) {
      this.activeList.is_completed = true;
    }

    const { error } = await this.supabase.client
      .from('shopping_lists')
      .update({ items: this.activeList.items, is_completed: this.activeList.is_completed })
      .eq('id', this.activeList.id);

    if (error) {
      console.error('Błąd zapisu stanu listy:', error);
    }

    if (this.activeList.is_completed) {
      this.activeList = null;
      await this.loadHistory();
    }
  }

  private async calculateItems(): Promise<ShoppingListItem[]> {
    const unitsPromise = this.supabase.client.from('units').select('*');
    const categoriesPromise = this.supabase.client.from('ingredient_categories').select('*');
    const ingredientsPromise = this.supabase.client.from('ingredients').select('id, category_id');

    const [
      { data: units, error: unitsError },
      { data: categoriesData, error: categoriesError },
      { data: ingredientsData, error: ingredientsError }
    ] = await Promise.all([unitsPromise, categoriesPromise, ingredientsPromise]);

    if (unitsError || categoriesError || ingredientsError)
      throw unitsError || categoriesError || ingredientsError;

    const unitMultipliers = new Map<string, number>(
      units.map((u: any) => [u.name, u.multiplier_to_grams])
    );
    const categoryDetailsMap = new Map<number, { name: string; shop_order: number }>();
    categoriesData.forEach((cat: any) =>
      categoryDetailsMap.set(cat.id, { name: cat.name, shop_order: cat.shop_order })
    );
    const ingredientToCategoryMap = new Map<string, number>(
      ingredientsData.map((ing: any) => [ing.id, ing.category_id])
    );

    const { data: mealPlans, error: mealPlansError } = await this.supabase.client
      .from('meal_plans')
      .select('recipes(id, ingredients_list)')
      .gte('date', this.startDate)
      .lte('date', this.endDate);

    if (mealPlansError) throw mealPlansError;
    if (!mealPlans || mealPlans.length === 0) return [];

    const aggregatedIngredients = new Map<string, ShoppingListItem>();
    const pieceUnits = ['szt', 'kromka', 'plaster', 'ząbek', 'jajko'];

    for (const plan of mealPlans) {
      const recipe = plan.recipes as any;
      if (recipe && recipe.ingredients_list) {
        for (const ingredient of recipe.ingredients_list) {
          const unit = ingredient.unit || 'g';
          const isPiece = pieceUnits.includes(unit.toLowerCase());
          const key = isPiece ? `${ingredient.name}-${unit}` : ingredient.name;

          if (aggregatedIngredients.has(key)) {
            const existing = aggregatedIngredients.get(key)!;
            const multiplier = isPiece ? 1 : unitMultipliers.get(unit) || 1;
            existing.amount += ingredient.amount * multiplier;
          } else {
            const categoryId = ingredientToCategoryMap.get(ingredient.ingredient_id);
            const catDetails = categoryId ? categoryDetailsMap.get(categoryId) : undefined;

            const category = catDetails ? catDetails.name : 'Inne';
            const shop_order = catDetails ? catDetails.shop_order : 99;

            let finalAmount = ingredient.amount;
            let finalUnit = unit;

            if (!isPiece) {
              const multiplier = unitMultipliers.get(unit) || 1;
              finalAmount = ingredient.amount * multiplier;
              finalUnit = 'g';
            }

            aggregatedIngredients.set(key, {
              name: ingredient.name,
              amount: Math.round(finalAmount * 100) / 100,
              unit: finalUnit,
              category: category,
              shop_order: shop_order,
              checked: false
            });
          }
        }
      }
    }

    return Array.from(aggregatedIngredients.values());
  }

  private updateCategories(): void {
    if (!this.activeList) {
      this.categories = [];
      return;
    }
    const categoryMap = new Map<string, number>();
    this.activeList.items.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, item.shop_order);
      }
    });
    this.categories = Array.from(categoryMap.keys()).sort(
      (a, b) => categoryMap.get(a)! - categoryMap.get(b)!
    );
  }

  getItemsForCategory(category: string): ShoppingListItem[] {
    if (!this.activeList) return [];
    return this.activeList.items
      .filter(item => item.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  setDefaultDates(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromTomorrow = new Date(tomorrow);
    weekFromTomorrow.setDate(tomorrow.getDate() + 6);
    this.startDate = this.formatDate(tomorrow);
    this.endDate = this.formatDate(weekFromTomorrow);
  }
}
