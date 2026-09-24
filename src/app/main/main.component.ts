import { Component, inject } from '@angular/core';
import { NavbarComponent } from '../components/navbar/navbar.component';
import { Router, RouterOutlet } from '@angular/router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environment';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-main',
  imports: [NavbarComponent, RouterOutlet, HeaderComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {
  private supabase: SupabaseClient;
  private router = inject(Router);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async handleLogout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/auth']);
  }
}
