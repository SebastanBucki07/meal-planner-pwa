import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-shopping-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-generator.component.html',
  styleUrls: ['./shopping-generator.component.scss']
})
export class ShoppingGeneratorComponent {
  @Input() startDate = '';
  @Output() startDateChange = new EventEmitter<string>();

  @Input() endDate = '';
  @Output() endDateChange = new EventEmitter<string>();

  @Output() generate = new EventEmitter<void>();
}
