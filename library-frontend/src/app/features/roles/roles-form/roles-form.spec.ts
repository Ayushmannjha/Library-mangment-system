import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { RolesForm } from './roles-form';

describe('RolesForm', () => {
  let component: RolesForm;
  let fixture: ComponentFixture<RolesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesForm],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in create mode by default', () => {
    expect(component.isEditMode()).toBe(false);
    expect(component.roleId()).toBeNull();
  });
});
