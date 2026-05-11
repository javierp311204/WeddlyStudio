import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeddingChecklistComponent } from './wedding-checklist.component';

describe('WeddingChecklistComponent', () => {
  let component: WeddingChecklistComponent;
  let fixture: ComponentFixture<WeddingChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeddingChecklistComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeddingChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
