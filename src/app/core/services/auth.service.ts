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

  async signUp(email: string, pass: string, displayName: string) {
    const response = await this.supabase.auth.signUp({ email, password: pass });

    if (response.data.user) {
      await this.supabase.from('new_profiles').insert({
        id: response.data.user.id,
        display_name: displayName
      });
    }

    return response;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    // Przekierowanie obsłuży onAuthStateChange po wyemitowaniu 'SIGNED_OUT'
  }

  get isAuthenticated(): boolean {
    return !!this.currentUser();
  }
}
