import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MacroSummaryComponent } from './macro-summary.component';

describe('MacroSummaryComponent', () => {
  let component: MacroSummaryComponent;
  let fixture: ComponentFixture<MacroSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MacroSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MacroSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
