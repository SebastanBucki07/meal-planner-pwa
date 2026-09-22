import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

const SUPABASE_URL = 'https://fhbrfempznqfmkesvfwn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7t_e_gYrTElN9PqfguU0sw_Ztto-ImZ';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Pobieranie sesji i nasłuchiwanie zmian stanu autoryzacji
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUserSubject.next(data.session?.user ?? null);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get user(): User | null {
    return this.currentUserSubject.value;
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  // Pobieranie posiłków na konkretny dzień dla zalogowanego użytkownika
  async getMealPlan(date: string) {
    const user = this.user;
    if (!user) throw new Error('Brak zalogowanego użytkownika');

    return await this.supabase
      .from('meal_plan')
      .select(
        `
      id,
      date,
      meal_type,
      servings,
      recipes (
        id,
        title,
        calories,
        protein,
        carbs,
        fat
      )
    `
      )
      .eq('user_id', user.id)
      .eq('date', date);
  }

  // Pobieranie listy dostępnych przepisów do wyboru
  async getRecipes() {
    return await this.supabase.from('recipes').select('*').order('title');
  }

  // Dodanie posiłku do planu
  async addMealToPlan(meal: {
    date: string;
    recipe_id: string;
    meal_type: string;
    servings: number;
  }) {
    const user = this.user;
    if (!user) throw new Error('Brak zalogowanego użytkownika');

    return await this.supabase.from('meal_plan').insert([{ ...meal, user_id: user.id }]);
  }

  // Usunięcie posiłku z planu
  async deleteMealFromPlan(id: string) {
    return await this.supabase.from('meal_plan').delete().eq('id', id);
  }

  // Dodawanie nowego przepisu do bazy
  async addRecipe(recipe: {
    title: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    instructions?: string;
  }) {
    const user = this.user;
    if (!user) throw new Error('Brak zalogowanego użytkownika');

    return await this.supabase.from('recipes').insert([{ ...recipe, user_id: user.id }]);
  }
}
