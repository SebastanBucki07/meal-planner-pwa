import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MacroValues {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

@Component({
  selector: 'app-macro-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './macro-summary.component.html',
  styleUrl: './macro-summary.component.scss'
})
export class MacroSummaryComponent {
  // Opcjonalny tytuł (np. "Dzisiejszy bilans" na pulpicie)
  title = input<string>();

  // Wartości spożyte i docelowe
  consumed = input.required<MacroValues>();
  targets = input.required<MacroValues>();

  // Automatyczne przeliczanie procentów z zabezpieczeniem przed dzieleniem przez 0
  progress = computed(() => {
    const c = this.consumed();
    const t = this.targets();

    const getPct = (val: number, target: number) => {
      if (!target || target <= 0) return 0;
      return Math.min(100, Math.round(((val || 0) / target) * 100));
    };

    return {
      caloriesPct: getPct(c.calories, t.calories),
      proteinPct: getPct(c.protein, t.protein),
      fatPct: getPct(c.fat, t.fat),
      carbsPct: getPct(c.carbs, t.carbs)
    };
  });
}
