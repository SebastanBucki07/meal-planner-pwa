import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IngredientService } from '../../core/services/ingredient.service';
import { UnitService } from '../../core/services/unit.service'; // <-- Import nowego serwisu
import {
  Ingredient,
  IngredientCategory,
  IngredientGroup,
  INGREDIENT_CATEGORIES
} from '../../core/models/';

@Component({
  selector: 'app-ingredients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ingredients.component.html',
  styleUrls: ['./ingredients.component.scss']
})
export class IngredientsComponent implements OnInit {
  public ingredientService = inject(IngredientService);
  public unitService = inject(UnitService); // <-- Wstrzyknięcie

  public categories: IngredientCategory[] = INGREDIENT_CATEGORIES;
  public selectedCategoryId = signal<number | null>(null);

  searchTerm = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  public isModalOpen = signal<boolean>(false);
  public editingIngredientId = signal<string | null>(null);

  public formData: Ingredient = this.getEmptyIngredient();

  public groupedIngredients = computed<IngredientGroup[]>(() => {
    const allIngredients = this.ingredientService.ingredients();
    const activeCatFilter = this.selectedCategoryId();
    const validCategoryIds = this.categories.map(c => c.id);

    return this.categories
      .filter(cat => activeCatFilter === null || cat.id === activeCatFilter)
      .map(category => {
        const items = allIngredients.filter(item => {
          const itemCatId =
            item.categoryId && validCategoryIds.includes(item.categoryId) ? item.categoryId : 10;
          return itemCatId === category.id;
        });

        return {
          category,
          items
        };
      })
      .filter(group => group.items.length > 0);
  });

  async ngOnInit(): Promise<void> {
    // Równoległe pobranie jednostek oraz składników przy inicjalizacji
    await Promise.all([this.unitService.fetchUnits(), this.loadData()]);
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadData();
    }, 300);
  }

  async loadData(): Promise<void> {
    await this.ingredientService.fetchIngredients(this.searchTerm);
  }

  selectCategoryFilter(categoryId: number | null): void {
    this.selectedCategoryId.set(categoryId);
  }

  openAddModal(): void {
    this.editingIngredientId.set(null);
    this.formData = this.getEmptyIngredient();
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.name.trim()) return;

    const success = await this.ingredientService.saveIngredient(this.formData);
    if (success) {
      this.closeModal();
    }
  }

  private getEmptyIngredient(): Ingredient {
    return {
      id: '',
      name: '',
      categoryId: 10,
      defaultUnitId: '', // Puste UUID domyślnie
      macrosPer100g: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    };
  }

  openEditModal(ingredient: Ingredient): void {
    this.editingIngredientId.set(ingredient.id);
    this.formData = {
      id: ingredient.id,
      name: ingredient.name,
      categoryId: ingredient.categoryId ?? 10,
      defaultUnitId: ingredient.defaultUnitId || '',
      macrosPer100g: { ...ingredient.macrosPer100g }
    };
    this.isModalOpen.set(true);
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
