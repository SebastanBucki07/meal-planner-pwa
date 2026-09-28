import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShoppingList } from '../../../core/models/shopping-list.model';

@Component({
  selector: 'app-shopping-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shopping-history.component.html', // Corrected template URL
  styleUrls: ['./shopping-history.component.scss'] // Corrected style URL
})
export class ShoppingHistoryComponent {
  @Input() history: ShoppingList[] = [];
  @Input() activeId: string | number | null = null; // Obsługuje string, number oraz null/undefined
  @Output() selectList = new EventEmitter<ShoppingList>();
}
