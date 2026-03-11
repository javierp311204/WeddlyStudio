import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarioPageComponent } from './calendario-page.component';

describe('CalendarioPageComponent', () => {
  let component: CalendarioPageComponent;
  let fixture: ComponentFixture<CalendarioPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarioPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarioPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
