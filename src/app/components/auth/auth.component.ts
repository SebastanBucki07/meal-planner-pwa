import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  email = '';
  password = '';
  isSignUp = false;
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      if (this.isSignUp) {
        const { data, error } = await this.supabase.signUp(this.email, this.password);
        if (error) throw error;

        if (data.session) {
          // Rejestracja udana bez wymagania maila -> przechodzimy do dashboardu
          this.router.navigate(['/dashboard']);
        } else {
          this.successMessage =
            'Konto zostało utworzone! Jeśli masz włączone potwierdzanie e-mail w Supabase, sprawdź skrzynkę odbiorczą.';
        }
      } else {
        const { error } = await this.supabase.signIn(this.email, this.password);
        if (error) throw error;
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      console.error('Błąd Supabase:', err);
      // Przechwytujemy i tłumaczymy najczęstsze błędy Supabase
      if (err.message.includes('User already registered')) {
        this.errorMessage = 'Użytkownik o tym adresie e-mail już istnieje! Wybierz logowanie.';
      } else if (err.message.includes('Password should be at least')) {
        this.errorMessage = 'Hasło musi mieć co najmniej 6 znaków.';
      } else {
        this.errorMessage = err.message || 'Wystąpił błąd podczas rejestracji/logowania.';
      }
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isSignUp = !this.isSignUp;
    this.errorMessage = '';
    this.successMessage = '';
  }
}
