import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ProfileMapper } from '../mappers/profile.mapper';
import { environment } from '../../../environment';
import { NewProfileDTO, Profile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private supabase: SupabaseClient;

  profile = signal<Profile | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async loadProfile(): Promise<Profile | null> {
    this.loading.set(true);
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) return null;

      // 1. Pobranie danych profilu z new_profiles
      const { data: profileData, error: profileError } = await this.supabase
        .from('new_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Błąd pobierania profilu:', profileError);
        return null;
      }

      // 2. Pobranie najnowszej wagi z new_weight_logs
      const { data: weightData } = await this.supabase
        .from('new_weight_logs')
        .select('weight')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestWeight = weightData?.weight ? Number(weightData.weight) : undefined;

      if (profileData) {
        const mappedProfile = ProfileMapper.toDomain(profileData as NewProfileDTO, latestWeight);
        this.profile.set(mappedProfile);
        return mappedProfile;
      }

      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(updatedProfile: Profile): Promise<boolean> {
    this.saving.set(true);
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      // 1. Zapis tylko pól profilowych w new_profiles (bez weight)
      const dto = ProfileMapper.toDTO({ ...updatedProfile, id: user.id });

      const { error: profileError } = await this.supabase
        .from('new_profiles')
        .upsert(dto, { onConflict: 'id' });

      if (profileError) {
        console.error('Błąd zapisu profilu:', profileError);
        return false;
      }

      // 2. Zapis dzisiejszej wagi w new_weight_logs
      if (updatedProfile.weight) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { error: weightError } = await this.supabase.from('new_weight_logs').upsert(
          {
            user_id: user.id,
            weight: updatedProfile.weight,
            date: todayStr
          },
          { onConflict: 'user_id,date' }
        );

        if (weightError) {
          console.warn('Błąd zapisu wagi w new_weight_logs:', weightError.message);
        }
      }

      this.profile.set(updatedProfile);
      return true;
    } finally {
      this.saving.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  // Dodaj tę metodę do klasy ProfileService:
  async updateWeight(newWeight: number): Promise<boolean> {
    try {
      const {
        data: { user }
      } = await this.supabase.auth.getUser();
      if (!user) return false;

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Zapis w tabeli logów wagi
      const { error: weightError } = await this.supabase.from('new_weight_logs').upsert(
        {
          user_id: user.id,
          weight: newWeight,
          date: todayStr
        },
        { onConflict: 'user_id,date' }
      );

      if (weightError) {
        console.error('Błąd zapisu wagi:', weightError);
        return false;
      }

      // 2. Aktualizacja w locie sygnału profile, żeby zmieniła się waga (i automatycznie przeliczyły kalorie, jeśli z niej korzystasz)
      const current = this.profile();
      if (current) {
        this.profile.set({
          ...current,
          weight: newWeight
        });
      }

      return true;
    } catch (e) {
      console.error('Nie udało się zaktualizować wagi:', e);
      return false;
    }
  }

  // w profile.service.ts

  private calculateNewTargets(weight: number, profile: Profile) {
    // Bazujemy na polu height z Twojego profilu (lub domyślnej wartości, jeśli opcjonalne)
    const height = profile.height || 175;
    const age = 30; // Jeśli nie masz wieku w profilu, przyjmujemy domyślny lub dodaj pole do interfejsu

    // Wzór Mifflin-St Jeor (przykładowy dla mężczyzn)
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    const tdee = bmr * 1.2; // Domyślný współczynnik aktywności, jeśli brak w modelu

    let targetCalories = Math.round(tdee);

    // Zależnie od tego, jakie pola masz w Profile, dopasuj warunki:
    // np. jeśli masz pole target_calories lub calories w profilu:
    const targetProtein = Math.round(weight * 2.0);

    return {
      weight: weight,
      calories: targetCalories, // Upewnij się, że Twoja tabela new_profiles ma taką kolumnę
      protein: targetProtein
    };
  }

  async updateWeightAndRecalculateTargets(newWeight: number): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const currentProfile = this.profile();
      if (!currentProfile) return false;

      // 1. Przeliczamy nowe cele na bazie nowej wagi i obecnego wzrostu z modelu domeny
      const height = currentProfile.height || 180;
      const bmr = (10 * newWeight) + (6.25 * height) - (5 * 30) + 5; // przykładowy wiek 30
      const tdee = bmr * 1.375; // umiarkowana aktywność

      const targetCalories = Math.round(tdee);
      const targetProtein = Math.round(newWeight * 2.0); // np. 2g na kg masy ciała
      const targetCarbs = Math.round((targetCalories * 0.4) / 4);
      const targetFat = Math.round((targetCalories * 0.25) / 9);

      // 2. Tworzymy zaktualizowany model domeny (z uwzględnieniem struktury targets)
      const updatedProfile: Profile = {
        ...currentProfile,
        weight: newWeight,
        targets: {
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat
        }
      };

      // 3. Używamy mappera, aby zamienić model domeny na DTO gotowe do wysłania do Supabase
      const dto = ProfileMapper.toDTO(updatedProfile);

      // 4. Zapis do bazy danych
      const { error: profileError } = await this.supabase
      .from('new_profiles')
      .update(dto)
      .eq('id', user.id);

      if (profileError) {
        console.error('Błąd aktualizacji celów w profilu:', profileError);
        return false;
      }

      // 5. Aktualizujemy lokalny sygnał – UI odświeży się natychmiast w całej aplikacji
      this.profile.set(updatedProfile);

      return true;
    } catch (e) {
      console.error('Błąd podczas przeliczania celów po zmianie wagi:', e);
      return false;
    }
  }

}
