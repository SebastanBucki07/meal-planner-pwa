import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DailySummary {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface TargetSummary {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

@Component({
  selector: 'app-macro-summaryyyyy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './macro-summary.component.html',
  styleUrl: './macro-summary.component.scss'
})
export class MacroSummaryComponent {
  summary = input.required<DailySummary>();
  targets = input.required<TargetSummary>();

  getPercent(current: number, target: number): number {
    if (!target) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }
}
