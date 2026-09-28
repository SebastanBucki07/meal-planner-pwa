import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeDetailModalComponent } from './recipe-detail-modal.component';

describe('RecipeDetailModalComponent', () => {
  let component: RecipeDetailModalComponent;
  let fixture: ComponentFixture<RecipeDetailModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetailModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetailModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
