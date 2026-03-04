import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanLimitsWidgetComponent } from './plan-limits-widget.component';

describe('PlanLimitsWidgetComponent', () => {
  let component: PlanLimitsWidgetComponent;
  let fixture: ComponentFixture<PlanLimitsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanLimitsWidgetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanLimitsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
