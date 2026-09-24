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
}
