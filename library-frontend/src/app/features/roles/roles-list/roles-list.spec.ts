import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { RolesList } from './roles-list';

describe('RolesList', () => {
  let component: RolesList;
  let fixture: ComponentFixture<RolesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesList],
      providers: [
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose expected permission modules', () => {
    expect(component.permissionModules.length).toBeGreaterThan(0);
  });
});
