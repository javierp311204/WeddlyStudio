import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Perfil2faComponent } from './perfil2fa.component';

describe('Perfil2faComponent', () => {
  let component: Perfil2faComponent;
  let fixture: ComponentFixture<Perfil2faComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Perfil2faComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Perfil2faComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
