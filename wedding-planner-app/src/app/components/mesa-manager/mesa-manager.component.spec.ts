import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesaManagerComponent } from './mesa-manager.component';

describe('MesaManagerComponent', () => {
  let component: MesaManagerComponent;
  let fixture: ComponentFixture<MesaManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesaManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesaManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
