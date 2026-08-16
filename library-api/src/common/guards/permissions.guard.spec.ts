import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const mockExecutionContext = (
    user: any,
    handler = jest.fn(),
    cls = class {},
  ): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = mockExecutionContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user context is missing', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STUDENT_CREATE']);
    const context = mockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User context is missing');
  });

  it('should throw ForbiddenException if user lacks required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STUDENT_CREATE', 'STUDENT_DELETE']);
    const context = mockExecutionContext({
      id: '1',
      roles: [], // Not a superuser role
      permissions: ['STUDENT_CREATE'], // Missing STUDENT_DELETE
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'Insufficient permissions',
    );
  });

  it('should return true if user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STUDENT_CREATE']);
    const context = mockExecutionContext({
      id: '1',
      roles: [], // Not a superuser role
      permissions: ['STUDENT_CREATE', 'STUDENT_UPDATE'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has a superuser role regardless of permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['STUDENT_DELETE']);
    const context = mockExecutionContext({
      id: '1',
      roles: ['SUPER_ADMIN'],
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
