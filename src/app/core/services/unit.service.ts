import { Injectable, signal } from '@angular/core';
import { Unit, UnitDto } from '../models/';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environment';
import { UnitMapper } from '../mappers/unit.mapper';

@Injectable({
  providedIn: 'root'
})
export class UnitService {
  private supabase: SupabaseClient;

  units = signal<Unit[]>([]);
  loading = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async fetchUnits(): Promise<void> {
    if (this.units().length > 0) return;

    this.loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('new_units')
        .select('*')
        .order('name', { ascending: true }); // <-- zamienione 'idx' na 'name'

      if (error) {
        console.error('Błąd podczas pobierania jednostek z bazy:', error);
        return;
      }

      if (data) {
        const domainUnits = UnitMapper.toDomainList(data as UnitDto[]);
        this.units.set(domainUnits);
      }
    } catch (err) {
      console.error('Wystąpił błąd podczas ładowania jednostek:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
