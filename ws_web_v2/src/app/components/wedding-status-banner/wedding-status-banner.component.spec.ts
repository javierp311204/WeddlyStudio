import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeddingStatusBannerComponent } from './wedding-status-banner.component';

describe('WeddingStatusBannerComponent', () => {
  let component: WeddingStatusBannerComponent;
  let fixture: ComponentFixture<WeddingStatusBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeddingStatusBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeddingStatusBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
