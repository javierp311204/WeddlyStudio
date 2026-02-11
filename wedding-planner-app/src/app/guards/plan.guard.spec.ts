import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';
import { PlanGuard } from './plan.guard';

describe('PlanGuard', () => {
  let guard: PlanGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlanGuard]
    });
    guard = TestBed.inject(PlanGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});