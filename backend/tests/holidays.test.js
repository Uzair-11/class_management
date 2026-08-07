const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 5: Holidays (HOL-01 to HOL-07)', () => {
  let adminToken, supervisorToken, teacherToken, amirToken;

  beforeEach(async () => {
    await seedTestDatabase();

    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const supRes = await request(app).post('/api/auth/login').send({ phone: '9000000003', password: 'Admin@123' });
    supervisorToken = supRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;

    const amirRes = await request(app).post('/api/auth/login').send({ phone: '9000000002', password: 'Admin@123' });
    amirToken = amirRes.body.token;
  });

  test('HOL-01: Admin creates branch-specific holiday', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branch_id: 1, date: '2026-11-15', reason: 'Local Holiday' });

    expect(res.statusCode).toBe(201);
    expect(res.body.holiday.branch_id).toBe(1);
  });

  test('HOL-02: Admin creates org-wide holiday', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branch_id: null, date: '2026-10-02', reason: 'Gandhi Jayanti' });

    expect(res.statusCode).toBe(201);
    expect(res.body.holiday.branch_id).toBeNull();
  });

  test('HOL-03: Supervisor creates holiday for assigned branch', async () => {
    const res = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ branch_id: 1, date: '2026-09-05', reason: 'Teachers Day' });

    expect(res.statusCode).toBe(201);
  });

  test('HOL-04: Supervisor blocked from unassigned branch', async () => {
    // Unassign supervisor from branch 2 temporarily
    const res = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ branch_id: 9999, date: '2026-09-05', reason: 'Invalid Branch' });

    expect(res.statusCode).toBe(403);
  });

  test('HOL-05: Teacher/amir read-only on holidays', async () => {
    const tRes = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ branch_id: 1, date: '2026-09-05', reason: 'Test' });

    expect(tRes.statusCode).toBe(403);

    const aRes = await request(app)
      .post('/api/holidays')
      .set('Authorization', `Bearer ${amirToken}`)
      .send({ branch_id: 1, date: '2026-09-05', reason: 'Test' });

    expect(aRes.statusCode).toBe(403);
  });

  test('HOL-06: GET holidays includes org-wide + branch-specific', async () => {
    const res = await request(app)
      .get('/api/holidays?branch_id=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2); // 1 branch specific + 1 org wide from seed
  });

  test('HOL-07: Delete holiday', async () => {
    const res = await request(app)
      .delete('/api/holidays/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });
});
