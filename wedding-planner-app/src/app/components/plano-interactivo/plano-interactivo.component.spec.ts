import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanoInteractivoComponent } from './plano-interactivo.component';

describe('PlanoInteractivoComponent', () => {
  let component: PlanoInteractivoComponent;
  let fixture: ComponentFixture<PlanoInteractivoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanoInteractivoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanoInteractivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
