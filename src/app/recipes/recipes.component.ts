import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {environment} from '../../environment';
import { NavbarComponent } from '../components/navbar/navbar.component';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NavbarComponent
  ],
  templateUrl: './recipes.component.html',
  styleUrls: ['./recipes.component.scss']
})
export class RecipesComponent implements OnInit {
  private supabase: SupabaseClient;
  recipes: any[] = [];
  loading: boolean = true;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await this.fetchRecipes();
  }

  async fetchRecipes() {
    this.loading = true;
    const { data, error } = await this.supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

    if (error) {
      console.error('Błąd pobierania przepisów:', error);
    } else if (data) {
      this.recipes = data;
    }
    this.loading = false;
  }
}
