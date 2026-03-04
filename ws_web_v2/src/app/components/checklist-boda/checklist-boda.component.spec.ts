import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecklistBodaComponent } from './checklist-boda.component';

describe('ChecklistBodaComponent', () => {
  let component: ChecklistBodaComponent;
  let fixture: ComponentFixture<ChecklistBodaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecklistBodaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecklistBodaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
