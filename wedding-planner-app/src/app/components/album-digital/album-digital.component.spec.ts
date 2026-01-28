import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbumDigitalComponent } from './album-digital.component';

describe('AlbumDigitalComponent', () => {
  let component: AlbumDigitalComponent;
  let fixture: ComponentFixture<AlbumDigitalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlbumDigitalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlbumDigitalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
