import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteAcceptComponent } from './invite-accept.component';

describe('InviteAcceptComponent', () => {
  let component: InviteAcceptComponent;
  let fixture: ComponentFixture<InviteAcceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteAcceptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteAcceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
