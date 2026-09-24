import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayMealsComponent } from './today-meals.component';

describe('TodayMealsComponent', () => {
  let component: TodayMealsComponent;
  let fixture: ComponentFixture<TodayMealsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodayMealsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TodayMealsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
