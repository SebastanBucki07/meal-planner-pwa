import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingListService } from '../../core/services/shopping-list.service';
import { ShoppingList } from '../../core/models/shopping-list.model';
import { ShoppingListViewComponent } from './shopping-list-view/shopping-list-view.component';
import { ShoppingHistoryComponent } from './shopping-history/shopping-history.component';
import { ShoppingGeneratorComponent } from './shopping-generator/shopping-generator.component';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [
    CommonModule,
    ShoppingGeneratorComponent,
    ShoppingHistoryComponent,
    ShoppingListViewComponent
  ],
  templateUrl: './shopping.component.html',
  styleUrls: ['./shopping.component.scss']
})
export class ShoppingComponent implements OnInit {
  public shoppingService = inject(ShoppingListService);

  public activeTab = signal<'list' | 'history'>('list');
  public startDate = '';
  public endDate = '';

  async ngOnInit(): Promise<void> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.startDate = today.toISOString().split('T')[0];
    this.endDate = nextWeek.toISOString().split('T')[0];

    await this.shoppingService.fetchHistory();

    // Pobieramy kategorie z bazy (jeśli serwis ma taką metodę)
    if (typeof this.shoppingService.fetchCategories === 'function') {
      await this.shoppingService.fetchCategories();
    }
  }

  public async addCustomItem(newItem: any): Promise<void> {
    // Przekazujemy tylko newItem, ponieważ serwis sam pobiera aktywne ID z activeList()
    await this.shoppingService.addCustomItemToActiveList(newItem);
  }

  public selectListFromHistory(list: ShoppingList): void {
    this.shoppingService.activeList.set(list);
    this.activeTab.set('list');
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
