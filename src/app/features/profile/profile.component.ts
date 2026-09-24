import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Profile } from '../../core/models';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  public profileService = inject(ProfileService);
  private router = inject(Router);

  message = '';

  // Stan formularza kalkulatora
  height: number | null = null;
  weight: number | null = null;
  age: number | null = 30;
  gender: 'male' | 'female' = 'male';
  workType: 'sedentary' | 'physical' = 'sedentary';
  workoutsPerWeek = 2;
  goal: 'lose' | 'maintain' | 'gain' = 'maintain';

  // Wyniki BMI
  bmi: number | null = null;
  bmiCategory = '';
  bmiColorClass = '';

  // Cele Makro
  targetCalories = 2000;
  targetProtein = 150;
  targetCarbs = 200;
  targetFat = 65;

  async ngOnInit(): Promise<void> {
    const data = await this.profileService.loadProfile();
    if (data) {
      this.height = data.height || null;
      this.weight = data.weight || null;
      this.targetCalories = data.targets.calories;
      this.targetProtein = data.targets.protein;
      this.targetCarbs = data.targets.carbs;
      this.targetFat = data.targets.fat;

      this.calculateBMI();
    }
  }

  calculateBMI(): void {
    if (!this.height || !this.weight || this.height <= 0 || this.weight <= 0) {
      this.bmi = null;
      return;
    }

    const heightInMeters = this.height / 100;
    this.bmi = Number((this.weight / (heightInMeters * heightInMeters)).toFixed(1));

    if (this.bmi < 18.5) {
      this.bmiCategory = 'Niedowaga';
      this.bmiColorClass = 'bmi-yellow';
    } else if (this.bmi <= 24.9) {
      this.bmiCategory = 'Waga prawidłowa (OK)';
      this.bmiColorClass = 'bmi-green';
    } else if (this.bmi <= 29.9) {
      this.bmiCategory = 'Nadwaga';
      this.bmiColorClass = 'bmi-orange';
    } else {
      this.bmiCategory = 'Otyłość';
      this.bmiColorClass = 'bmi-red';
    }
  }

  calculateTDEE(): void {
    if (!this.height || !this.weight || !this.age) {
      alert('Uzupełnij wzrost, wagę oraz wiek, aby obliczyć zapotrzebowanie!');
      return;
    }

    this.calculateBMI();

    // 1. BMR (Mifflin-St Jeor)
    let bmr = 10 * this.weight + 6.25 * this.height - 5 * this.age;
    bmr += this.gender === 'male' ? 5 : -161;

    // 2. Współczynnik Aktywności (PAL) bazujący na tabeli
    const palTable: Record<'sedentary' | 'physical', number[]> = {
      sedentary: [1.2, 1.25, 1.3, 1.35, 1.4, 1.45],
      physical: [1.35, 1.4, 1.45, 1.5, 1.55, 1.65]
    };
    const index = Math.min(Math.max(this.workoutsPerWeek, 0), 5);
    const pal = palTable[this.workType][index];

    let tdee = bmr * pal;

    // 3. Cel
    if (this.goal === 'lose') tdee -= 300;
    if (this.goal === 'gain') tdee += 200;

    this.targetCalories = Math.round(tdee);

    // 4. Makroskładniki
    this.targetProtein = Math.round(this.weight * 2.0);
    this.targetFat = Math.round((this.targetCalories * 0.25) / 9);

    const carbCalories = this.targetCalories - (this.targetProtein * 4 + this.targetFat * 9);
    this.targetCarbs = Math.max(0, Math.round(carbCalories / 4));
  }

  async saveProfile(): Promise<void> {
    this.message = '';
    const current = this.profileService.profile();

    const updatedProfile: Profile = {
      id: current?.id || '',
      displayName: current?.displayName || 'Użytkownik',
      height: this.height ? Number(this.height) : undefined,
      weight: this.weight ? Number(this.weight) : undefined,
      targets: {
        calories: Number(this.targetCalories),
        protein: Number(this.targetProtein),
        carbs: Number(this.targetCarbs),
        fat: Number(this.targetFat)
      }
    };

    const success = await this.profileService.saveProfile(updatedProfile);

    this.message = success ? 'Ustawienia i nowa waga zostały zapisane! 🎉' : 'Nie udało się zapisać zmian w bazie.';
    if (success) setTimeout(() => (this.message = ''), 4000);
  }

  async logout(): Promise<void> {
    await this.profileService.logout();
    this.router.navigate(['/auth']);
  }
}
