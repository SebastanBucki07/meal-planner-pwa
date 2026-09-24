import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyBalanceComponent } from './daily-balance.component';

describe('DailyBalanceComponent', () => {
  let component: DailyBalanceComponent;
  let fixture: ComponentFixture<DailyBalanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyBalanceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DailyBalanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
