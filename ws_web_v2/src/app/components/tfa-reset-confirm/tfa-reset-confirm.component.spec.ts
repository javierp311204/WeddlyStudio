import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TfaResetConfirmComponent } from './tfa-reset-confirm.component';

describe('TfaResetConfirmComponent', () => {
  let component: TfaResetConfirmComponent;
  let fixture: ComponentFixture<TfaResetConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TfaResetConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TfaResetConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
