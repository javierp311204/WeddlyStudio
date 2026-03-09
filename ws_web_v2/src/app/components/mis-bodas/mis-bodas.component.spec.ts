import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisBodasComponent } from './mis-bodas.component';

describe('MisBodasComponent', () => {
  let component: MisBodasComponent;
  let fixture: ComponentFixture<MisBodasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisBodasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MisBodasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
