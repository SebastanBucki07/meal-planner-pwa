import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealPlanComponentComponent } from './meal-plan-component.component';

describe('MealPlanComponentComponent', () => {
  let component: MealPlanComponentComponent;
  let fixture: ComponentFixture<MealPlanComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealPlanComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealPlanComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
