const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 6: Fees — Monthly Cycles (FEE-01 to FEE-12)', () => {
  let adminToken, teacherToken;

  beforeEach(async () => {
    await seedTestDatabase();

    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;
  });

  test('FEE-01: No cycle at admission (month 0)', async () => {
    const res = await request(app)
      .get('/api/students/1/fee-cycles')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.cycles.length).toBe(0);
  });

  test('FEE-02 & FEE-03 & FEE-04 & FEE-05: Cycle generation for past admission dates', async () => {
    // Manipulate admission_date to 2 months ago for student 2 (partial relief 50)
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '2 months' WHERE id = 2`);

    const res = await request(app)
      .get('/api/students/2/fee-cycles')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.cycles.length).toBe(2);
    expect(res.body.cycles[0].cycle_number).toBe(1);
    expect(res.body.cycles[1].cycle_number).toBe(2);
    expect(res.body.cycles.every(c => c.cycle_number !== 0)).toBe(true);
    expect(parseFloat(res.body.cycles[0].relief_amount)).toBe(50);
  });

  test('FEE-06: Payment recorded against correct cycle', async () => {
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '1 month' WHERE id = 1`);

    const cycleRes = await request(app).get('/api/students/1/fee-cycles').set('Authorization', `Bearer ${teacherToken}`);
    const cycleId = cycleRes.body.cycles[0].id;

    const res = await request(app)
      .post(`/api/fee-cycles/${cycleId}/payments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ amount: 100, payment_date: '2026-08-05', payment_mode: 'cash' });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.cycle.status).toBe('partial');
  });

  test('FEE-07: Overpayment blocked', async () => {
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '1 month' WHERE id = 1`);

    const cycleRes = await request(app).get('/api/students/1/fee-cycles').set('Authorization', `Bearer ${teacherToken}`);
    const cycleId = cycleRes.body.cycles[0].id;

    const res = await request(app)
      .post(`/api/fee-cycles/${cycleId}/payments`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ amount: 9999, payment_date: '2026-08-05', payment_mode: 'cash' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/exceed/i);
  });

  test('FEE-08: No new cycles if dropped/completed', async () => {
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '3 months', status = 'dropped' WHERE id = 1`);

    const res = await request(app).get('/api/students/1/fee-cycles').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.cycles.length).toBe(0);
  });

  test('FEE-09 & FEE-10: Overdue status & branch overdue list', async () => {
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '2 months' WHERE id = 1`);

    const res = await request(app)
      .get('/api/branches/1/fee-cycles?status=overdue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('FEE-11 & FEE-12: Total outstanding calculations', async () => {
    await pool.query(`UPDATE students SET admission_date = CURRENT_DATE - INTERVAL '1 month' WHERE id = 1`);

    const res = await request(app).get('/api/students/1/fee-cycles').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total_outstanding).toBe(350);
  });
});
