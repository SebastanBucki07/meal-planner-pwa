import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;

  currentUser = signal<User | null>(null);
  displayName = signal<string>('Użytkownik');

  constructor(private router: Router) {
    // 1. Jawnie włączamy zapamiętywanie sesji w localStorage oraz auto-refreshing
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    this.initAuth();
  }

  // Dodaj to wewnątrz klasy AuthService
  public async getSessionPormise() {
    return await this.supabase.auth.getSession();
  }

  private async initAuth(): Promise<void> {
    // Odczyt aktualnej sesji z localStorage przy starcie
    const {
      data: { session }
    } = await this.supabase.auth.getSession();

    if (session?.user) {
      this.currentUser.set(session.user);
      await this.loadUserProfile(session.user.id);
    }

    // 2. Słuchanie zmian autoryzacji
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      this.currentUser.set(user);

      if (user) {
        await this.loadUserProfile(user.id);
      } else if (event === 'SIGNED_OUT') {
        // Zamiast przekierowywać przy każdym braku użytkownika (np. przejściowym podczas HMR),
        // przekierowujemy TYLKO wtedy, gdy użytkownik kliknął "Wyloguj" (zdarzenie SIGNED_OUT)
        this.displayName.set('Użytkownik');
        this.router.navigate(['/auth']);
      }
    });
  }

  async loadUserProfile(userId: string): Promise<void> {
    const { data } = await this.supabase
      .from('new_profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    if (data?.display_name) {
      this.displayName.set(data.display_name);
    } else {
      this.displayName.set('Użytkownik');
    }
  }

  async signIn(email: string, pass: string) {
    return await this.supabase.auth.signInWithPassword({ email, password: pass });
  }

  // w auth.service.ts
  async signUp(
    email: string,
    password: string,
    displayName: string,
    profileData?: {
      height: number | null;
      weight: number | null;
      age: number | null;
      gender: 'male' | 'female';
      workType: 'sedentary' | 'physical';
      workoutsPerWeek: number;
      goal: 'lose' | 'maintain' | 'gain';
    }
  ) {
    // 1. Rejestracja w Auth
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user && profileData) {
      // 2. Wstępne obliczenia makro na podstawie podanych danych
      const weight = profileData.weight || 75;
      const height = profileData.height || 180;
      const age = profileData.age || 30;

      let bmr = 10 * weight + 6.25 * height - 5 * age;
      bmr += profileData.gender === 'male' ? 5 : -161;

      const pal = profileData.workType === 'sedentary' ? 1.3 : 1.4;
      let tdee = bmr * pal;

      if (profileData.goal === 'lose') tdee -= 300;
      if (profileData.goal === 'gain') tdee += 200;

      const targetCalories = Math.round(tdee);
      const targetProtein = Math.round(weight * 2.0);
      const targetFat = Math.round((targetCalories * 0.25) / 9);
      const targetCarbs = Math.max(
        0,
        Math.round((targetCalories - (targetProtein * 4 + targetFat * 9)) / 4)
      );

      // 3. Zapis pełnego profilu w tabeli new_profiles
      const { error: profileError } = await this.supabase.from('new_profiles').insert({
        id: data.user.id,
        display_name: displayName,
        height: profileData.height,
        weight: profileData.weight,
        age: profileData.age,
        gender: profileData.gender,
        work_type: profileData.workType,
        workouts_per_week: profileData.workoutsPerWeek,
        goal: profileData.goal,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fat: targetFat
      });

      if (profileError) return { error: profileError };
    }

    return { data, error: null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    // Przekierowanie obsłuży onAuthStateChange po wyemitowaniu 'SIGNED_OUT'
  }

  get isAuthenticated(): boolean {
    return !!this.currentUser();
  }
}
