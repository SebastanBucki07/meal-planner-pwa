import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ProfileMapper } from '../mappers/profile.mapper';
import { environment } from '../../../environment';
import { Profile } from '../models';

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
    const {
      data: { user },
      error: authError
    } = await this.supabase.auth.getUser();
    if (authError || !user) return null;

    const userId = user.id;

    // 1. Pobranie profilu z tabeli new_profiles
    const { data: profileData, error } = await this.supabase
      .from('new_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profileData) return null;

    // 2. Pobranie najnowszej wagi z new_weight_logs
    const { data: latestWeightData } = await this.supabase
      .from('new_weight_logs')
      .select('weight')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    // Fallback: jeśli nie ma wpisów w new_weight_logs, bierzemy wagę z profilu (profileData.weight)
    const latestWeight = latestWeightData?.weight ?? profileData.weight ?? undefined;

    // 3. Mapowanie do modelu domeny
    const domainProfile = ProfileMapper.toDomain(profileData, latestWeight);

    this.profile.set(domainProfile);
    return domainProfile;
  }

  async saveProfile(profile: Profile): Promise<boolean> {
    const userId = profile.id;

    // 1. Zapisujemy dane profilu w tabeli new_profiles
    const dto = ProfileMapper.toDTO(profile);
    const { error: profileError } = await this.supabase
      .from('new_profiles')
      .update(dto)
      .eq('id', userId);

    if (profileError) {
      console.error('Błąd zapisu profilu:', profileError);
      return false;
    }

    // 2. Jeśli podano wagę, zapisujemy nowy wpis w historii (new_weight_logs)
    if (profile.weight) {
      await this.supabase.from('new_weight_logs').insert({
        user_id: userId,
        weight: profile.weight,
        recorded_at: new Date().toISOString()
      });
    }

    // 3. Aktualizacja sygnału profilu (używamy właściwej nazwy `profile`)
    this.profile.set(profile);
    return true;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  // Dodaj tę metodę do klasy ProfileService:
  async updateWeight(newWeight: number): Promise<boolean> {
    const {
      data: { user },
      error: authError
    } = await this.supabase.auth.getUser();
    if (authError || !user) return false;
    const userId = user.id;

    // 1. Zapisz nowy pomiar w historii (to zaktualizuje wykresy i najnowszą wagę)
    const { error: logError } = await this.supabase.from('new_weight_logs').insert({
      user_id: userId,
      weight: newWeight,
      recorded_at: new Date().toISOString()
    });

    if (logError) {
      console.error('Błąd zapisu wagi do logów:', logError);
      return false;
    }

    // 2. Opcjonalnie: zaktualizuj też kolumnę weight w new_profiles (jeśli tam też ją trzymasz jako cache)
    await this.supabase
      .from('new_profiles')
      .update({ weight: newWeight, updated_at: new Date().toISOString() })
      .eq('id', userId);

    // 3. Odśwież lokalny sygnał profilu, żeby cała aplikacja od razu widziała nową wagę
    const currentProfile = this.profile();
    if (currentProfile) {
      this.profile.set({
        ...currentProfile,
        weight: newWeight
      });
    }

    return true;
  }
}
