import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisenoPapeleriaComponent } from './diseno-papeleria.component';

describe('DisenoPapeleriaComponent', () => {
  let component: DisenoPapeleriaComponent;
  let fixture: ComponentFixture<DisenoPapeleriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisenoPapeleriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisenoPapeleriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
