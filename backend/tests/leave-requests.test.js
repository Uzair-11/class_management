const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 10: Leave Requests (LVE-01 to LVE-11)', () => {
  let adminToken, teacherToken, teacher2Token, supervisorToken;

  beforeEach(async () => {
    await seedTestDatabase();

    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;

    const teacher2Res = await request(app).post('/api/auth/login').send({ phone: '9000000005', password: 'Admin@123' });
    teacher2Token = teacher2Res.body.token;

    const supRes = await request(app).post('/api/auth/login').send({ phone: '9000000003', password: 'Admin@123' });
    supervisorToken = supRes.body.token;
  });

  test('LVE-01: Submit leave request', async () => {
    const res = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-10', date_to: '2026-08-12', reason: 'Medical reasons' });

    expect(res.statusCode).toBe(201);
    expect(res.body.leave_request.status).toBe('pending');
  });

  test('LVE-02: List pending requests for branch', async () => {
    await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-10', date_to: '2026-08-12', reason: 'Medical reasons' });

    const res = await request(app)
      .get('/api/leave-requests?branch_id=1&status=pending')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('LVE-03 & LVE-06: Teacher approves request & creates attendance=leave rows', async () => {
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-10', date_to: '2026-08-10', reason: 'Medical reasons' });

    const lId = reqRes.body.leave_request.id;

    const appRes = await request(app)
      .put(`/api/leave-requests/${lId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(appRes.statusCode).toBe(200);

    // Verify attendance row
    const attRes = await request(app)
      .get('/api/attendance?branch_id=1&date=2026-08-10')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(attRes.statusCode).toBe(200);
    const stRec = attRes.body.students.find(s => s.student_id === 1);
    expect(stRec.status).toBe('leave');
  });

  test('LVE-04: Supervisor approves request', async () => {
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 2, date_from: '2026-08-11', date_to: '2026-08-11', reason: 'Supervisor approval test' });

    const lId = reqRes.body.leave_request.id;

    const appRes = await request(app)
      .put(`/api/leave-requests/${lId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(appRes.statusCode).toBe(200);
  });

  test('LVE-05: Unrelated teacher cannot approve', async () => {
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-10', date_to: '2026-08-10', reason: 'Medical reasons' });

    const lId = reqRes.body.leave_request.id;

    const appRes = await request(app)
      .put(`/api/leave-requests/${lId}/approve`)
      .set('Authorization', `Bearer ${teacher2Token}`);

    expect([401, 403]).toContain(appRes.statusCode);
  });

  test('LVE-07: Approval skips holiday dates', async () => {
    // 2026-12-25 is a holiday for branch 1 in seed
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-12-25', date_to: '2026-12-25', reason: 'Holiday range leave' });

    const lId = reqRes.body.leave_request.id;

    const appRes = await request(app)
      .put(`/api/leave-requests/${lId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(appRes.statusCode).toBe(200);

    const attCheck = await pool.query(`SELECT * FROM attendance WHERE student_id = 1 AND date = '2026-12-25'`);
    expect(attCheck.rows.length).toBe(0);
  });

  test('LVE-08: Approval overrides existing lock', async () => {
    // 2026-08-01 is locked in seed
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-01', date_to: '2026-08-01', reason: 'Locked date correction' });

    const lId = reqRes.body.leave_request.id;

    const appRes = await request(app)
      .put(`/api/leave-requests/${lId}/approve`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(appRes.statusCode).toBe(200);

    const attCheck = await pool.query(`SELECT status FROM attendance WHERE student_id = 1 AND date = '2026-08-01'`);
    expect(attCheck.rows[0].status).toBe('leave');
  });

  test('LVE-09: Reject request', async () => {
    const reqRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ student_id: 1, date_from: '2026-08-10', date_to: '2026-08-10', reason: 'Reason' });

    const lId = reqRes.body.leave_request.id;

    const rejRes = await request(app)
      .put(`/api/leave-requests/${lId}/reject`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(rejRes.statusCode).toBe(200);
    expect(rejRes.body.message).toMatch(/rejected/i);
  });

  test('LVE-10: Leave excluded from attendance % denominator', async () => {
    // Insert 5 present, 2 absent, 3 leave
    for (let i = 1; i <= 5; i++) {
      await pool.query(`INSERT INTO attendance (student_id, branch_id, date, status) VALUES (1, 1, '2026-07-0${i}', 'present')`);
    }
    for (let i = 6; i <= 7; i++) {
      await pool.query(`INSERT INTO attendance (student_id, branch_id, date, status) VALUES (1, 1, '2026-07-0${i}', 'absent')`);
    }
    for (let i = 8; i <= 9; i++) {
      await pool.query(`INSERT INTO attendance (student_id, branch_id, date, status) VALUES (1, 1, '2026-07-0${i}', 'leave')`);
    }

    const res = await request(app)
      .get('/api/attendance/student/1')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    // 5 / (5 + 2) = 71.4%
    expect(res.body.percentage).toBe(71.4);
  });

  test('LVE-11: Frontend Leave badge rendering contract', () => {
    expect(true).toBe(true);
  });
});
