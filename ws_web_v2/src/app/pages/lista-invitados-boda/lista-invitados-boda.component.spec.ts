import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaInvitadosBodaComponent } from './lista-invitados-boda.component';

describe('ListaInvitadosBodaComponent', () => {
  let component: ListaInvitadosBodaComponent;
  let fixture: ComponentFixture<ListaInvitadosBodaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaInvitadosBodaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaInvitadosBodaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
