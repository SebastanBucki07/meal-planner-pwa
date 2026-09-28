import { Injectable, signal } from '@angular/core';
import { ShoppingList, ShoppingListDto, ShoppingListItem } from '../models/shopping-list.model';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { ShoppingListMapper } from '../mappers/shopping-list.mapper';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private supabase: SupabaseClient;

  historyLists = signal<ShoppingList[]>([]);
  activeList = signal<ShoppingList | null>(null);
  loading = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async fetchHistory(): Promise<void> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('new_shopping_lists')
        .select('*')
        .eq('is_completed', false) // Pobieramy tylko te, które nie są ukończone
        .order('start_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const lists = ShoppingListMapper.toDomainList(data as ShoppingListDto[]);
        this.historyLists.set(lists);

        if (lists.length > 0 && !this.activeList()) {
          this.activeList.set(lists[0]);
        } else if (lists.length === 0) {
          this.activeList.set(null);
        }
      }
    } catch (err) {
      console.error('Błąd podczas pobierania historii list zakupów:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async saveListProgress(updatedList: ShoppingList): Promise<void> {
    try {
      if (!updatedList.items || updatedList.items.length === 0) return;

      // Sprawdzamy czy absolutnie wszystkie elementy są zaznaczone
      const allChecked = updatedList.items.every(item => item.checked);

      if (allChecked) {
        updatedList.is_completed = true;
      }

      const { error } = await this.supabase
        .from('new_shopping_lists')
        .update({
          items: updatedList.items,
          is_completed: updatedList.is_completed
        })
        .eq('id', updatedList.id);

      if (error) throw error;

      if (allChecked) {
        // Jeśli lista ukończona: usuwamy ją z aktywnego widoku
        this.activeList.set(null);
        // Odświeżamy historię (lub filtrujemy, żeby ukończone nie wisiały w bieżących)
        await this.fetchHistory();
      } else {
        // Zwykły zapis postępu
        this.historyLists.update(lists =>
          lists.map(l => (l.id === updatedList.id ? { ...updatedList } : l))
        );
      }
    } catch (err) {
      console.error('Błąd podczas zapisu stanu listy:', err);
    }
  }

  async generateNewListFromMealPlan(startDate: string, endDate: string): Promise<boolean> {
    this.loading.set(true);
    try {
      // 1. Pobieramy plany posiłków wraz z przepisami w zadanym zakresie dat
      const { data: mealPlans, error: planError } = await this.supabase
        .from('new_meal_plans')
        .select(
          `
          servings,
          recipe_id,
          new_recipes (
            id,
            title
          )
        `
        )
        .gte('date', startDate)
        .lte('date', endDate);

      if (planError) {
        console.error('Szczegóły błędu planera:', planError);
        alert('Błąd pobierania planera: ' + planError.message);
        return false;
      }

      if (!mealPlans || mealPlans.length === 0) {
        alert(
          'Brak zaplanowanych posiłków w wybranym zakresie dat! Najpierw dodaj przepisy do planera.'
        );
        return false;
      }

      // Wyciągamy unikalne ID przepisów z planera
      const recipeIds = [...new Set(mealPlans.map(p => p.recipe_id).filter(Boolean))];

      if (recipeIds.length === 0) {
        alert('Znaleziono plany, ale żaden nie ma przypisanego przepisu.');
        return false;
      }

      // 2. Pobieramy składniki dla tych przepisów z tabeli łączącej wraz z nazwami i kategoriami składników
      const { data: recipeIngredients, error: ingError } = await this.supabase
        .from('new_recipe_ingredients')
        .select(
          `
          recipe_id,
          amount,
          unit,
          new_ingredients (
            name,
            category_id,
            new_ingredient_categories (
              name
            )
          )
        `
        )
        .in('recipe_id', recipeIds);

      if (ingError) {
        console.error('Błąd pobierania składników przepisów:', ingError);
        alert('Błąd pobierania składników: ' + ingError.message);
        return false;
      }

      // Tworzymy mapę zapotrzebowania na porcje dla każdego przepisu w planerze
      // (przepis może wystąpić w wielu dniach lub posiłkach, więc sumujemy jego porcje)
      const recipeServingsMap = new Map<string, number>();
      mealPlans.forEach((plan: any) => {
        if (!plan.recipe_id) return;
        const currentServings = recipeServingsMap.get(plan.recipe_id) || 0;
        recipeServingsMap.set(plan.recipe_id, currentServings + (Number(plan.servings) || 1));
      });

      // 3. Agregacja i przeliczanie składników uwzględniające liczbę porcji
      const aggregatedMap = new Map<string, ShoppingListItem>();

      recipeIngredients?.forEach((ri: any) => {
        const recipeId = ri.recipe_id;
        const totalServings = recipeServingsMap.get(recipeId) || 1;

        const ingredientData = ri.new_ingredients;
        if (!ingredientData) return;

        const ingredientName = ingredientData.name;
        // Kategoria składnika (zależnie czy wyciągnęło obiekt relacji kategorii, czy przypisujemy domyślną)
        const categoryName = ingredientData.new_ingredient_categories?.name || 'Inne';

        const baseAmount = Number(ri.amount) || 0;
        const amountToAdd = baseAmount * totalServings;
        const unitName = ri.unit || 'g';

        const key = `${ingredientName.toLowerCase().trim()}_${unitName.toLowerCase().trim()}`;

        if (aggregatedMap.has(key)) {
          const existing = aggregatedMap.get(key)!;
          existing.amount += amountToAdd;
        } else {
          aggregatedMap.set(key, {
            name: ingredientName,
            amount: amountToAdd,
            unit: unitName,
            category: categoryName,
            checked: false
          });
        }
      });

      const finalShoppingItems = Array.from(aggregatedMap.values());

      if (finalShoppingItems.length === 0) {
        alert('Znaleziono przepisy, ale nie mają przypisanych żadnych składników w bazie!');
        return false;
      }

      // 4. Zapisujemy wygenerowaną listę do tabeli 'new_shopping_lists'
      const { data: newListData, error: insertError } = await this.supabase
        .from('new_shopping_lists')
        .insert([
          {
            start_date: startDate,
            end_date: endDate,
            items: finalShoppingItems,
            is_completed: false
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Błąd zapisu listy:', insertError);
        alert('Nie udało się zapisać listy zakupów: ' + insertError.message);
        return false;
      }

      const newList = ShoppingListMapper.toDomain(newListData as ShoppingListDto);
      this.historyLists.update(lists => [newList, ...lists]);
      this.activeList.set(newList);
      return true;
    } catch (err) {
      console.error('Nieoczekiwany błąd:', err);
      alert('Wystąpił nieoczekiwany błąd podczas generowania listy.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
