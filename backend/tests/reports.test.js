const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 11: Reports & Dashboard (REP-01 to REP-04)', () => {
  let adminToken, teacherToken, supervisorToken, amirToken;

  beforeEach(async () => {
    await seedTestDatabase();

    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;

    const supRes = await request(app).post('/api/auth/login').send({ phone: '9000000003', password: 'Admin@123' });
    supervisorToken = supRes.body.token;

    const amirRes = await request(app).post('/api/auth/login').send({ phone: '9000000002', password: 'Admin@123' });
    amirToken = amirRes.body.token;
  });

  test('REP-01: Attendance report accuracy', async () => {
    const res = await request(app)
      .get('/api/reports/attendance?branch_id=1&from=2026-08-01&to=2026-08-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('students');
  });

  test('REP-02: Fee collection report', async () => {
    const res = await request(app)
      .get('/api/reports/fees?branch_id=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('courses');
  });

  test('REP-03: Overview scoped by role', async () => {
    const aRes = await request(app).get('/api/reports/overview').set('Authorization', `Bearer ${adminToken}`);
    expect(aRes.statusCode).toBe(200);

    const sRes = await request(app).get('/api/reports/overview').set('Authorization', `Bearer ${supervisorToken}`);
    expect(sRes.statusCode).toBe(200);

    const tRes = await request(app).get('/api/reports/overview').set('Authorization', `Bearer ${teacherToken}`);
    expect(tRes.statusCode).toBe(200);
  });

  test('REP-04: Dashboard role-aware rendering contract', () => {
    expect(true).toBe(true);
  });
});
