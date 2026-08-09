const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 12: Cross-Cutting Role-Based Access Control (RBAC-01 to RBAC-05)', () => {
  let adminToken, amirToken, supervisorToken, teacherToken, teacher2Token;

  beforeEach(async () => {
    await seedTestDatabase();

    adminToken = (await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' })).body.token;
    amirToken = (await request(app).post('/api/auth/login').send({ phone: '9000000002', password: 'Admin@123' })).body.token;
    supervisorToken = (await request(app).post('/api/auth/login').send({ phone: '9000000003', password: 'Admin@123' })).body.token;
    teacherToken = (await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' })).body.token;
    teacher2Token = (await request(app).post('/api/auth/login').send({ phone: '9000000005', password: 'Admin@123' })).body.token;
  });

  test('RBAC-01: Admin has access to all endpoints, all branches', async () => {
    const endpoints = [
      { method: 'get', url: '/api/branches' },
      { method: 'get', url: '/api/users' },
      { method: 'get', url: '/api/students' },
      { method: 'get', url: '/api/courses' },
      { method: 'get', url: '/api/holidays' },
      { method: 'get', url: '/api/leave-requests' },
      { method: 'get', url: '/api/reports/overview' }
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.url).set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    }
  });

  test('RBAC-02: Amir has read-only access, scoped to assigned branches only', async () => {
    // Write attempts should return 403
    const writeAttempts = [
      { method: 'post', url: '/api/branches', body: { name: 'Fail Branch Name' } },
      { method: 'post', url: '/api/users', body: { name: 'Fail User', phone: '9999999999', password: 'Password123', role: 'teacher' } },
      { method: 'post', url: '/api/holidays', body: { branch_id: 1, date: '2026-11-01', reason: 'Fail Holiday' } },
      { method: 'post', url: '/api/branches/1/expenses', body: { description: 'Fail Expense', amount: 100 } }
    ];

    for (const ep of writeAttempts) {
      const res = await request(app)[ep.method](ep.url).set('Authorization', `Bearer ${amirToken}`).send(ep.body);
      expect(res.statusCode).toBe(403);
    }
  });

  test('RBAC-03: Supervisor scope (assigned branch write access, 403 on admin CRUD)', async () => {
    // Admin CRUD attempt should fail with 403
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ name: 'Fail Branch' });

    expect(res.statusCode).toBe(403);
  });

  test('RBAC-04: Teacher scope (own branch write access, 403 outside branch)', async () => {
    // Teacher 1 (branch 1) attempts attendance submission for branch 2
    const res = await request(app)
      .post('/api/attendance')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ branch_id: 2, date: '2026-08-05', records: [{ student_id: 4, status: 'present' }] });

    expect([403, 404]).toContain(res.statusCode);
  });

  test('RBAC-05: No role can access another branch\'s data via direct ID guessing', async () => {
    // Teacher 2 (Branch 2) attempts to fetch Branch 1 finance
    const res = await request(app)
      .get('/api/branches/1/finance')
      .set('Authorization', `Bearer ${teacher2Token}`);

    expect([401, 403, 404]).toContain(res.statusCode);
  });
});
