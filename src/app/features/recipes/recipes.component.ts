import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss']
})
export class RecipesComponent implements OnInit, OnDestroy {
  public recipeService = inject(RecipeService);

  // Stan filtrów formularza
  searchTerm = '';
  maxCalories: number | null = null;
  minProtein: number | null = null;
  minCarbs: number | null = null;
  minFat: number | null = null;

  // Paginacja
  currentPage = 1;
  pageSize = 12;

  private filterTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  ngOnDestroy(): void {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset do 1. strony przy zmianie filtrów
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
    this.filterTimeout = setTimeout(() => {
      this.loadData();
    }, 300); // Debounce na wpisywanie tekstowe / filtry
  }

  async loadData(): Promise<void> {
    await this.recipeService.fetchRecipes({
      searchTerm: this.searchTerm,
      maxCalories: this.maxCalories,
      minProtein: this.minProtein,
      minCarbs: this.minCarbs,
      minFat: this.minFat,
      page: this.currentPage,
      pageSize: this.pageSize
    });
  }

  async changePage(newPage: number): Promise<void> {
    if (newPage >= 1 && newPage <= this.recipeService.totalPages() && newPage !== this.currentPage) {
      this.currentPage = newPage;
      await this.loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
