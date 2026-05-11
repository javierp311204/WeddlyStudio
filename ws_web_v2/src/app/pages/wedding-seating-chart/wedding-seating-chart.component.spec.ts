import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeddingSeatingChartComponent } from './wedding-seating-chart.component';

describe('WeddingSeatingChartComponent', () => {
  let component: WeddingSeatingChartComponent;
  let fixture: ComponentFixture<WeddingSeatingChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeddingSeatingChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeddingSeatingChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
