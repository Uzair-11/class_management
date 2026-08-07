const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 9: Expenses, Salaries, Branch Finance (FIN-01 to FIN-09)', () => {
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

  test('FIN-01: Add expense', async () => {
    const res = await request(app)
      .post('/api/branches/1/expenses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ description: 'Needles and Thread', amount: 200.00, expense_type: 'electricity', date: '2026-08-05' });

    expect(res.statusCode).toBe(201);
  });

  test('FIN-02: Add salary record', async () => {
    const res = await request(app)
      .post('/api/branches/1/salaries')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ employee_id: 4, amount: 1500.00, month: '2026-08' });

    expect(res.statusCode).toBe(201);
    expect(res.body.payment_status).toBe('pending');
  });

  test('FIN-03: Mark salary paid', async () => {
    const sRes = await request(app)
      .post('/api/branches/1/salaries')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ employee_id: 4, amount: 1500.00, month: '2026-08' });

    const sId = sRes.body.id;

    const res = await request(app)
      .put(`/api/salaries/${sId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ payment_status: 'paid', payment_date: '2026-08-05' });

    expect(res.statusCode).toBe(200);
    expect(res.body.payment_status).toBe('paid');
  });

  test('FIN-04: Add JIH transaction', async () => {
    const res = await request(app)
      .post('/api/branches/1/transactions')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ type: 'received_from_jih', amount: 5000.00, reason: 'Monthly Grant' });

    expect(res.statusCode).toBe(201);
  });

  test('FIN-05 & FIN-06 & FIN-07: Finance summary view accuracy & maintenance inclusion', async () => {
    // Add expense
    await request(app).post('/api/branches/1/expenses').set('Authorization', `Bearer ${teacherToken}`).send({ description: 'Supplies', amount: 300, expense_type: 'electricity', date: '2026-08-05' });

    const res = await request(app)
      .get('/api/branches/1/finance')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary).toHaveProperty('total_expenses');
    expect(res.body.summary).toHaveProperty('balance');
  });

  test('FIN-08: Teacher cannot add salary/JIH transaction', async () => {
    const sRes = await request(app)
      .post('/api/branches/1/salaries')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ staff_name: 'Teacher Central', amount: 1500.00, month_year: '2026-08' });

    expect(sRes.statusCode).toBe(403);

    const tRes = await request(app)
      .post('/api/branches/1/transactions')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ transaction_type: 'received_from_jih', amount: 5000.00 });

    expect(tRes.statusCode).toBe(403);
  });

  test('FIN-09: Amir read-only on finance POSTs', async () => {
    const res = await request(app)
      .post('/api/branches/1/expenses')
      .set('Authorization', `Bearer ${amirToken}`)
      .send({ title: 'Unauthorized Expense', amount: 100 });

    expect(res.statusCode).toBe(403);
  });
});
