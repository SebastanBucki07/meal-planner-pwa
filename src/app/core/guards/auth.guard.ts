import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // CZEKAMY na odczytanie sesji przez klienta Supabase
  const { data: { session } } = await authService.getSessionPormise();

  if (session) {
    return true; // Użytkownik jest zalogowany, przepuszczamy
  }

  // Brak sesji, przekierowujemy na login
  return router.parseUrl('/auth');
};
