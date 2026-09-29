import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-shopping-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-list-view.component.html',
  styleUrls: ['./shopping-list-view.component.scss']
})
export class ShoppingListViewComponent {
  @Input() list: any;
  @Input() categories: any[] = []; // Tutaj muszą przyjść kategorie z serwisu

  @Output() itemToggled = new EventEmitter<any>();
  @Output() customItemAdded = new EventEmitter<any>();

  newItemName = '';
  newItemAmount = 1;
  newItemUnit = 'szt.';
  selectedCategory = '';

  toggleItem(item: any) {
    item.checked = !item.checked; // natychmiastowa zmiana lokalna
    this.itemToggled.emit(item);
  }

  onAddCustomItem() {
    if (!this.newItemName.trim() || !this.selectedCategory) return;

    const newItem = {
      name: this.newItemName.trim(),
      amount: this.newItemAmount || 1,
      unit: this.newItemUnit.trim() || 'szt.',
      category: this.selectedCategory,
      checked: false
    };

    this.customItemAdded.emit(newItem);

    // Reset formularza
    this.newItemName = '';
    this.newItemAmount = 1;
    this.newItemUnit = 'szt.';
    this.selectedCategory = '';
  }

  public getCategoryClass(categoryName: string): string {
    if (!categoryName) return 'category-default';

    const name = categoryName.toLowerCase().trim();

    if (name.includes('pieczywo')) return 'category-bakery';
    if (name.includes('warzywa')) return 'category-vegetables';
    if (name.includes('owoce')) return 'category-fruits';
    if (name.includes('nabiał')) return 'category-dairy';
    if (name.includes('sery')) return 'category-cheese';
    if (name.includes('wędina') || name.includes('wedlina')) return 'category-cold-cuts';
    if (name.includes('mięso')) return 'category-meat';
    if (name.includes('ryby')) return 'category-fish';
    if (name.includes('mrożonki')) return 'category-frozen';
    if (name.includes('ryże') || name.includes('kasze') || name.includes('makarony'))
      return 'category-grains';
    if (name.includes('konserwy')) return 'category-cans';
    if (name.includes('przyprawy')) return 'category-spices';
    if (name.includes('chemia domowa')) return 'category-chemia';
    if (name.includes('higiena')) return 'category-higiena';
    if (name.includes('dom i kuchnia')) return 'category-dom';
    if (name.includes('alkohole')) return 'category-alcohol';
    if (name.includes('dziecięce')) return 'category-kids';
    if (name.includes('chipsy') || name.includes('przekąski')) return 'category-snacks';
    if (name.includes('napoje')) return 'category-beverages';
    if (name.includes('kawa') || name.includes('herbata')) return 'category-coffee';

    return 'category-default';
  }
}
