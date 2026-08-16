const dotenv = require('dotenv');
dotenv.config();

const BASE = 'http://localhost:3000/api/v1';

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

async function main() {
  const { PrismaClient } = require('./dist/generated/prisma/client.js');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  const ts = Date.now();
  const email = `smoke_${ts}@test.io`;
  const password = 'SmokePass123!';

  // 1. Register a fresh user via LIVE API
  const reg = await api('POST', '/auth/register', { body: { email, password, first_name: 'Smoke', last_name: 'User' } });
  console.log('1. REGISTER          ->', reg.status, reg.json?.success);

  // 2. Promote via prisma to SUPER_ADMIN (needed to probe all endpoints live)
  const u = await p.users.findFirst({ where: { email } });
  const saRole = await p.roles.findFirst({ where: { code: 'SUPER_ADMIN' } });
  if (u && saRole) {
    await p.user_roles.deleteMany({ where: { user_id: u.id } });
    await p.user_roles.create({ data: { user_id: u.id, role_id: saRole.id } });
  }

  // 3. Login
  const login = await api('POST', '/auth/login', { body: { email, password } });
  const token = login.json?.data?.accessToken;
  console.log('2. LOGIN             ->', login.status, 'token:', token ? 'OK' : 'MISSING');

  // 4. /auth/me shape
  const me = await api('GET', '/auth/me', { token });
  const meKeys = me.json?.data ? Object.keys(me.json.data).join(',') : 'NO-DATA';
  console.log('3. /auth/me          ->', me.status, '| keys:', meKeys);

  // 5. Frontend-flagged endpoints
  console.log('--- FRONTEND-RISK ENDPOINTS ---');
  const logout = await api('POST', '/auth/logout', { token, body: { refresh_token: 'x' } });
  console.log('4. POST /auth/logout ->', logout.status, '(frontend calls; backend missing?)');

  const rolesList = await api('GET', '/roles', { token });
  console.log('5. GET /roles        ->', rolesList.status, Array.isArray(rolesList.json?.data) ? `(${rolesList.json.data.length} rows)` : rolesList.json?.message);

  const roleCreate = await api('POST', '/roles', { token, body: { name: 'SmokeRole', code: `SMOKE_${ts}` } });
  console.log('6. POST /roles       ->', roleCreate.status, '(frontend roles.service createRole)');

  const roleById = await api('GET', '/roles/1', { token });
  console.log('7. GET /roles/1      ->', roleById.status, '(frontend getRoleById)');

  const perms = await api('GET', '/permissions', { token });
  console.log('8. GET /permissions  ->', perms.status, Array.isArray(perms.json?.data) ? `(${perms.json.data.length})` : perms.json?.message);

  const dashboard = await api('GET', '/reports/dashboard', { token });
  console.log('9. GET /reports/dashboard ->', dashboard.status, dashboard.json?.data ? `keys: ${Object.keys(dashboard.json.data).join(',')}` : dashboard.json?.message);

  const saas = await api('GET', '/reports/saas-dashboard', { token });
  console.log('10. GET /reports/saas-dashboard ->', saas.status, saas.json?.data ? `keys: ${Object.keys(saas.json.data).join(',')}` : saas.json?.message);

  const libraries = await api('GET', '/libraries', { token });
  console.log('11. GET /libraries   ->', libraries.status, Array.isArray(libraries.json?.data) ? `(${libraries.json.data.length})` : libraries.json?.message);

  await p.$disconnect();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });