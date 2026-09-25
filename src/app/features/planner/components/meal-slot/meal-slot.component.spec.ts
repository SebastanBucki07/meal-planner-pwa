import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealSlotComponent } from './meal-slot.component';

describe('MealSlotComponent', () => {
  let component: MealSlotComponent;
  let fixture: ComponentFixture<MealSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealSlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealSlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
