import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShoppingGeneratorComponent } from './shopping-generator.component';

describe('ShoppingGeneratorComponent', () => {
  let component: ShoppingGeneratorComponent;
  let fixture: ComponentFixture<ShoppingGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShoppingGeneratorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
