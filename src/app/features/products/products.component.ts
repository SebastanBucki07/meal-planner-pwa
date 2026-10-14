import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { Ingredient } from '../../core/models'; // Dopasuj ścieżkę do swojego modelu składnika

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  public productService = inject(ProductService);
  private ingredientService = inject(IngredientService);

  searchTerm = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  public isModalOpen = signal<boolean>(false);
  public editingProductId = signal<string | null>(null);

  // Sygnał przechowujący listę składników bazowych do wyboru w select
  public ingredients = signal<Ingredient[]>([]);

  public formData: Product = this.getEmptyProduct();

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadData(),
      this.loadIngredients()
    ]);
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
    await this.productService.fetchProducts(this.searchTerm);
  }

  async loadIngredients(): Promise<void> {
    await this.ingredientService.fetchIngredients('');
    this.ingredients.set(this.ingredientService.ingredients());
  }

  openAddModal(): void {
    this.editingProductId.set(null);
    this.formData = this.getEmptyProduct();
    this.isModalOpen.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProductId.set(product.id);
    this.formData = { ...product };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async onSubmit(): Promise<void> {
    if (!this.formData.name.trim() || !this.formData.ingredientId) return;

    const success = await this.productService.saveProduct(this.formData);
    if (success) {
      this.closeModal();
      await this.loadData();
    }
  }

  private getEmptyProduct(): Product {
    return {
      id: '',
      ingredientId: '',
      name: '',
      brand: '',
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0
    };
  }
}
