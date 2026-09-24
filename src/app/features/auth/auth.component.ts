import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  isRegisterMode = false;
  email = '';
  password = '';
  displayName = '';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;

    try {
      if (this.isRegisterMode) {
        if (!this.displayName.trim()) {
          this.errorMessage = 'Podaj swoją ksywkę / imię.';
          this.loading = false;
          return;
        }

        const { error } = await this.authService.signUp(
          this.email,
          this.password,
          this.displayName
        );
        if (error) throw error;

        this.router.navigate(['/dashboard']);
      } else {
        const { error } = await this.authService.signIn(this.email, this.password);
        if (error) throw error;

        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Wystąpił błąd podczas autoryzacji.';
    } finally {
      this.loading = false;
    }
  }
}
