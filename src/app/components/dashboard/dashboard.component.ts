import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userEmail: string | undefined = '';

  // Przykładowe wartości docelowe pod redukcję
  targetCalories = 2000;
  consumedCalories = 1350;

  targetProtein = 150;
  consumedProtein = 95;

  targetCarbs = 200;
  consumedCarbs = 140;

  targetFat = 65;
  consumedFat = 45;

  constructor(private supabase: SupabaseService, private router: Router) {}

  ngOnInit() {
    this.userEmail = this.supabase.user?.email;
  }

  get caloriePercentage(): number {
    return Math.min(Math.round((this.consumedCalories / this.targetCalories) * 100), 100);
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}
