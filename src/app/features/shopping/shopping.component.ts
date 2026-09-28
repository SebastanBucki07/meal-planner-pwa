import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingListService } from '../../core/services/shopping-list.service';
import { ShoppingList, ShoppingListItem } from '../../core/models/shopping-list.model';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping.component.html', // Upewnij się, że nazwa pliku HTML w katalogu się zgadza
  styleUrls: ['./shopping.component.scss']
})
export class ShoppingComponent implements OnInit {
  public shoppingService = inject(ShoppingListService);

  public activeTab = signal<'list' | 'history'>('list');

  public startDate = '';
  public endDate = '';

  // Wyciąganie unikalnych kategorii z aktywnej listy
  public categories = computed<string[]>(() => {
    const list = this.shoppingService.activeList();
    if (!list || !list.items) return [];
    const cats = list.items.map(item => item.category || 'Inne');
    return Array.from(new Set(cats));
  });

  async ngOnInit(): Promise<void> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.startDate = today.toISOString().split('T')[0];
    this.endDate = nextWeek.toISOString().split('T')[0];

    await this.shoppingService.fetchHistory();
  }

  public selectListFromHistory(list: ShoppingList): void {
    this.shoppingService.activeList.set(list);
    this.activeTab.set('list');
  }

  public getItemsForCategory(category: string): ShoppingListItem[] {
    const list = this.shoppingService.activeList();
    if (!list || !list.items) return [];
    return list.items.filter(item => (item.category || 'Inne') === category);
  }

  public async onItemCheck(): Promise<void> {
    const active = this.shoppingService.activeList();
    if (active) {
      await this.shoppingService.saveListProgress(active);
    }
  }

  public async generateShoppingList(): Promise<void> {
    if (!this.startDate || !this.endDate) {
      alert('Wybierz datę początkową i końcową!');
      return;
    }

    const success = await this.shoppingService.generateNewListFromMealPlan(
      this.startDate,
      this.endDate
    );
    if (success) {
      this.activeTab.set('list');
    }
  }
}
