import {Component, OnInit} from '@angular/core';
import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {environment} from '../../../environment';
import {FormsModule} from '@angular/forms';
import {NavbarComponent} from '../navbar/navbar.component';
import {NgClass, NgIf} from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
    NavbarComponent,
    NgIf,
    NgClass
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private supabase: SupabaseClient;

  loading: boolean = true;
  saving: boolean = false;
  message: string = '';

  // Dane użytkownika do kalkulatora
  height: number | null = null; // cm
  weight: number | null = null; // kg
  age: number | null = 30; // domyślnie
  gender: 'male' | 'female' = 'male';
  workType: 'sedentary' | 'physical' = 'sedentary';
  workoutsPerWeek: number = 2; // 0, 1-2, 3-4, 5+
  goal: 'lose' | 'maintain' | 'gain' = 'maintain';

  // Wyniki kalkulatora
  bmi: number | null = null;
  bmiCategory: string = '';
  bmiColorClass: string = '';

  // Cele Makro
  targetCalories: number = 2000;
  targetProtein: number = 150;
  targetCarbs: number = 200;
  targetFat: number = 65;

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY);
  }

  async ngOnInit() {
    await this.fetchProfile();
  }

  async fetchProfile() {
    this.loading = true;
    const { data: { user } } = await this.supabase.auth.getUser();

    if (user) {
      const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

      if (data) {
        this.targetCalories = data.target_calories || 2000;
        this.targetProtein = data.target_protein || 150;
        this.targetCarbs = data.target_carbs || 200;
        this.targetFat = data.target_fat || 65;
        this.height = data.height || null;
        this.weight = data.weight || null;

        if (this.height && this.weight) {
          this.calculateBMI();
        }
      }
    }
    this.loading = false;
  }

  // Obliczanie BMI (WHO)
  calculateBMI() {
    if (!this.height || !this.weight || this.height <= 0 || this.weight <= 0) return;

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

  // Zoptymalizowane obliczanie Zapotrzebowania Kalorycznego
  calculateTDEE() {
    if (!this.height || !this.weight || !this.age) {
      alert('Uzupełnij wzrost, wagę oraz wiek, aby obliczyć zapotrzebowanie!');
      return;
    }

    this.calculateBMI();

    // 1. BMR (Wzór Mifflina-St Jeor)
    let bmr = (10 * this.weight) + (6.25 * this.height) - (5 * this.age);
    bmr += (this.gender === 'male') ? 5 : -161;

    // 2. Bardziej realistyczny/stonowany Współczynnik Aktywności (PAL)
    let pal = 1.2;

    if (this.workType === 'sedentary') {
      // Praca siedząca - precyzyjne stopniowanie dla każdego treningu
      if (this.workoutsPerWeek === 0) pal = 1.2;
      else if (this.workoutsPerWeek === 1) pal = 1.25; // 1 trening
      else if (this.workoutsPerWeek === 2) pal = 1.30; // 2 treningi
      else if (this.workoutsPerWeek === 3) pal = 1.35; // 3 treningi
      else if (this.workoutsPerWeek === 4) pal = 1.40; // 4 treningi
      else pal = 1.45;                                 // 5+ treningów
    } else {
      // Praca fizyczna
      if (this.workoutsPerWeek === 0) pal = 1.35;
      else if (this.workoutsPerWeek === 1) pal = 1.40;
      else if (this.workoutsPerWeek === 2) pal = 1.45;
      else if (this.workoutsPerWeek === 3) pal = 1.50;
      else if (this.workoutsPerWeek === 4) pal = 1.55;
      else pal = 1.65;
    }

    let tdee = bmr * pal;

    // 3. Cel (Umiarkowany deficyt 300 kcal / nadwyżka 200 kcal)
    if (this.goal === 'lose') {
      tdee -= 300; // Bezpieczny deficyt, bez głodówki
    } else if (this.goal === 'gain') {
      tdee += 200; // Czysta masa, bez zbędnego tłuszczu
    }

    this.targetCalories = Math.round(tdee);

    // 4. Makroskładniki (Białko: 2g/kg, Tłuszcze: ok. 25-30% kalorii, Węgle: reszta)
    this.targetProtein = Math.round(this.weight * 2.0);
    this.targetFat = Math.round((this.targetCalories * 0.25) / 9);

    const proteinCalories = this.targetProtein * 4;
    const fatCalories = this.targetFat * 9;
    const carbCalories = this.targetCalories - (proteinCalories + fatCalories);

    this.targetCarbs = Math.max(0, Math.round(carbCalories / 4));
  }

  async saveProfile() {
    this.saving = true;
    this.message = '';

    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      this.message = 'Brak autoryzacji.';
      this.saving = false;
      return;
    }

    try {
      // 1. Zapis/Aktualizacja w profilu głównym
      const { error: profileError } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        target_calories: this.targetCalories,
        target_protein: this.targetProtein,
        target_carbs: this.targetCarbs,
        target_fat: this.targetFat,
        height: this.height,
        weight: this.weight,
        updated_at: new Date()
      });

      if (profileError) throw profileError;

      // 2. Dodanie nowego wpisu do historii wagi (weight_logs), jeśli waga została podana
      if (this.weight) {
        const todayStr = new Date().toISOString().split('T')[0];

        const { error: weightError } = await this.supabase
        .from('weight_logs')
        .insert({
          user_id: user.id,
          weight: this.weight,
          date: todayStr // Upewnij się, że nazwa klucza odpowiada nazwie kolumny w Supabase
        });

        if (weightError) {
          console.warn('Błąd zapisu wagi:', weightError.message);
        }
      }

      this.message = 'Ustawienia i nowa waga zostały zapisane! 🎉';
    } catch (error) {
      console.error('Błąd zapisu profilu:', error);
      this.message = 'Nie udało się zapisać zmian.';
    } finally {
      this.saving = false;
    }
  }
}
