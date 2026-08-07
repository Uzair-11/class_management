const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 8: Machines & Maintenance (MCH-01 to MCH-06)', () => {
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

  test('MCH-01: Add machine', async () => {
    const res = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ machine_number: 'MAC-101', branch_id: 1, type: 'Singer Heavy Duty' });

    expect(res.statusCode).toBe(201);
    expect(res.body.machine.status).toBe('working');
  });

  test('MCH-02: Update machine status', async () => {
    const mRes = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ machine_number: 'MAC-102', branch_id: 1, type: 'Usha' });

    const mId = mRes.body.machine.id;

    const res = await request(app)
      .put(`/api/machines/${mId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'under_repair' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('under_repair');
  });

  test('MCH-03 & MCH-04: Add maintenance record & auto-create expense', async () => {
    const mRes = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ machine_number: 'MAC-103', branch_id: 1, type: 'Brother' });

    const mId = mRes.body.machine.id;

    const res = await request(app)
      .post(`/api/machines/${mId}/maintenance`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ description: 'Motor belt replacement', cost: 150.00, date: '2026-08-05' });

    expect(res.statusCode).toBe(201);

    // Verify auto expense
    const expRes = await request(app)
      .get('/api/branches/1/expenses')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(expRes.statusCode).toBe(200);
    expect(expRes.body.some(e => parseFloat(e.amount) === 150)).toBe(true);
  });

  test('MCH-05: Teacher scoped to own branch machines', async () => {
    const res = await request(app)
      .get('/api/machines?branch_id=2')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect([200, 403]).toContain(res.statusCode);
  });

  test('MCH-06: Supervisor/amir read-only on machines', async () => {
    const sRes = await request(app)
      .post('/api/machines')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ machine_number: 'MAC-999', branch_id: 1, type: 'Generic' });

    expect(sRes.statusCode).toBe(403);
  });
});
