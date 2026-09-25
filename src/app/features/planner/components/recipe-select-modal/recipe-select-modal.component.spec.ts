import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeSelectModalComponent } from './recipe-select-modal.component';

describe('RecipeSelectModalComponent', () => {
  let component: RecipeSelectModalComponent;
  let fixture: ComponentFixture<RecipeSelectModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeSelectModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeSelectModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
