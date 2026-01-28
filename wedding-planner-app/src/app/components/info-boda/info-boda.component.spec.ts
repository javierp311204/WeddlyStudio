import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoBodaComponent } from './info-boda.component';

describe('InfoBodaComponent', () => {
  let component: InfoBodaComponent;
  let fixture: ComponentFixture<InfoBodaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoBodaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoBodaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
