import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { Unauthorized } from './unauthorized';

describe('Unauthorized', () => {
  let component: Unauthorized;
  let fixture: ComponentFixture<Unauthorized>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Unauthorized],
      providers: [
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Unauthorized);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
