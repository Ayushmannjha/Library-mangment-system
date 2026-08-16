import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

const PASSWORD = 'StrongPass123!';

/**
 * Unit tests for AuthenticationService.
 *
 * We mock Prisma + Jwt so these tests verify AUTH BUILDING BLOCKS in
 * isolation:
 *  - password is ALWAYS hashed (never stored/compared as plain text)
 *  - password_hash is NEVER returned to clients
 *  - identical error for unknown email vs wrong password (no user enumeration)
 *  - refresh endpoint rejects access tokens (type separation)
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    users: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    roles: { findFirst: jest.Mock };
    user_roles: { create: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let storedHash: string;

  const rolesUser = { id: 3n, code: 'USER' };
  const userRecord = {
    id: 42n,
    email: 'test@example.com',
    first_name: 'Raj',
    last_name: null,
    library_id: null,
    status: 'ACTIVE',
    password_hash: 'hashed',
  };

  beforeEach(async () => {
    prisma = {
      users: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      roles: { findFirst: jest.fn().mockResolvedValue(rolesUser) },
      user_roles: { create: jest.fn() },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'JWT_EXPIRES_IN') return '15m';
              return '7d';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Default register setup: no existing user, create returns userRecord and
    // records the hash that would be persisted.
    prisma.users.findFirst.mockResolvedValue(null);
    prisma.users.create.mockImplementation(
      (args: { data: { password_hash: string } }) => {
        storedHash = args.data.password_hash;
        return Promise.resolve(userRecord);
      },
    );
  });

  describe('register', () => {
    it('hashes the password with argon2 (never plain text)', async () => {
      await service.register({
        email: userRecord.email,
        password: PASSWORD,
        first_name: 'Raj',
      });
      expect(storedHash).toBeTruthy();
      expect(storedHash).not.toBe(PASSWORD);
      // A plaintext password would FAIL argon2.verify; only a real argon2
      // hash can verify successfully.
      expect(await argon2.verify(storedHash, PASSWORD)).toBe(true);
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.users.findFirst.mockResolvedValue(userRecord);
      await expect(
        service.register({
          email: 'test@example.com',
          password: PASSWORD,
          first_name: 'Raj',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('never returns the password hash', async () => {
      const result = await service.register({
        email: userRecord.email,
        password: PASSWORD,
        first_name: 'Raj',
      });
      expect(JSON.stringify(result)).not.toContain('password_hash');
      expect(JSON.stringify(result)).not.toContain('hashed');
      expect(prisma.user_roles.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues tokens with distinct access/refresh payload types', async () => {
      const hash = await argon2.hash(PASSWORD);
      prisma.users.findFirst.mockResolvedValue({
        ...userRecord,
        password_hash: hash,
      });

      await service.login({ email: 'test@example.com', password: PASSWORD });

      // signAsync is called twice (access + refresh) with a `type` field that
      // separates the two kinds of tokens.
      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
      const calls = jwt.signAsync.mock.calls as Array<
        [Record<string, string>, unknown]
      >;
      expect(calls[0][0].type).toBe('access');
      expect(calls[1][0].type).toBe('refresh');
    });

    it('returns the SAME error for unknown email and wrong password', async () => {
      prisma.users.findFirst.mockResolvedValue(null);
      let msg1 = '';
      try {
        await service.login({ email: 'nobody@x.io', password: PASSWORD });
      } catch (e) {
        msg1 = (e as { message: string }).message;
      }

      const hash = await argon2.hash(PASSWORD);
      prisma.users.findFirst.mockResolvedValue({
        ...userRecord,
        password_hash: hash,
      });
      let msg2 = '';
      try {
        await service.login({
          email: 'test@example.com',
          password: 'different!',
        });
      } catch (e) {
        msg2 = (e as { message: string }).message;
      }

      // Identical messages -> attackers cannot enumerate valid emails
      // by comparing error text.
      expect(msg1).toBe(msg2);
    });

    it('never returns the password hash', async () => {
      const hash = await argon2.hash(PASSWORD);
      prisma.users.findFirst.mockResolvedValue({
        ...userRecord,
        password_hash: hash,
      });
      const result = await service.login({
        email: 'test@example.com',
        password: PASSWORD,
      });
      expect(JSON.stringify(result)).not.toContain('password_hash');
      expect(JSON.stringify(result)).not.toContain('hashed');
    });
  });

  describe('refresh', () => {
    it('rejects a token whose payload type is NOT refresh', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: '42', type: 'access' });
      await expect(
        service.refresh({ refreshToken: 'some-jwt' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a missing/inactive account', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: '42', type: 'refresh' });
      prisma.users.findUnique.mockResolvedValue(null);
      await expect(
        service.refresh({ refreshToken: 'some-jwt' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token signed with the wrong secret ', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
      await expect(
        service.refresh({ refreshToken: 'bad-jwt' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
