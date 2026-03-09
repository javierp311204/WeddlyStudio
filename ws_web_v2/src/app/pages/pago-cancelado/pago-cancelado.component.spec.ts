import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoCanceladoComponent } from './pago-cancelado.component';

describe('PagoCanceladoComponent', () => {
  let component: PagoCanceladoComponent;
  let fixture: ComponentFixture<PagoCanceladoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoCanceladoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoCanceladoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
