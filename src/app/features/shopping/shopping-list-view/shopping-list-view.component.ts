import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingList, ShoppingListItem } from '../../../core/models/shopping-list.model';

@Component({
  selector: 'app-shopping-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-list-view.component.html',
  styleUrls: ['./shopping-list-view.component.scss']
})
export class ShoppingListViewComponent {
  @Input() list!: ShoppingList;
  @Output() itemToggled = new EventEmitter<void>();

  public categories = computed<string[]>(() => {
    if (!this.list || !this.list.items) return [];
    const cats = this.list.items.map(item => item.category || 'Inne');
    return Array.from(new Set(cats));
  });

  public getItemsForCategory(category: string): ShoppingListItem[] {
    if (!this.list || !this.list.items) return [];
    return this.list.items.filter(item => (item.category || 'Inne') === category);
  }
}
