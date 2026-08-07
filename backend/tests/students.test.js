const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 3: Students & Courses (STU-01 to STU-12)', () => {
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

  test('STU-01: Courses are seeded correctly', async () => {
    const res = await request(app).get('/api/courses').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe('Basic Course');
    expect(parseFloat(res.body[0].fee)).toBe(350);
  });

  test('STU-02: Create student, no relief', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Student No Relief',
        phone: '9111111111',
        branch_id: 1,
        course_id: 1,
        relief_type: 'none',
        relief_amount: 0,
        admission_date: '2026-08-01'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.student.relief_type).toBe('none');
  });

  test('STU-03: Create student, partial relief', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Student Partial Relief',
        phone: '9222222222',
        branch_id: 1,
        course_id: 1,
        relief_type: 'partial',
        relief_amount: 100,
        admission_date: '2026-08-01'
      });

    expect(res.statusCode).toBe(201);
    expect(parseFloat(res.body.student.relief_amount)).toBe(100);
  });

  test('STU-04: Create student, full relief', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Student Full Relief',
        phone: '9333333333',
        branch_id: 1,
        course_id: 2,
        relief_type: 'full',
        relief_amount: 500,
        admission_date: '2026-08-01'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.student.relief_type).toBe('full');
  });

  test('STU-05: Relief amount cannot exceed fee', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Invalid Relief Student',
        phone: '9444444444',
        branch_id: 1,
        course_id: 1, // fee 350
        relief_type: 'partial',
        relief_amount: 500,
        admission_date: '2026-08-01'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/exceed/i);
  });

  test('STU-06: Teacher sees only own branch students', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${teacherToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.every(s => s.branch_id === 1)).toBe(true);
  });

  test('STU-07: Supervisor/amir see assigned branches students', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('STU-08: Admin sees all students', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(4);
  });

  test('STU-09: Branch filter works', async () => {
    const res = await request(app).get('/api/students?branch_id=2').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.every(s => s.branch_id === 2)).toBe(true);
  });

  test('STU-10: Edit student details', async () => {
    const res = await request(app)
      .put('/api/students/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Student Name', phone: '9000000001', address: 'New Addr', branch_id: 1, course_id: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Updated Student Name');
  });

  test('STU-11: Change student status', async () => {
    const res = await request(app)
      .put('/api/students/1/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'dropped' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('dropped');
  });

  test('STU-12: Student list balance column', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body[0]).toHaveProperty('balance');
  });
});
