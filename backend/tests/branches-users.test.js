const request = require('supertest');
const app = require('../app');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 2: Branches & Users (BRU-01 to BRU-12)', () => {
  let adminToken, teacherToken, supervisorToken, amirToken;

  beforeEach(async () => {
    await seedTestDatabase();

    // Login tokens
    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;

    const supRes = await request(app).post('/api/auth/login').send({ phone: '9000000003', password: 'Admin@123' });
    supervisorToken = supRes.body.token;

    const amirRes = await request(app).post('/api/auth/login').send({ phone: '9000000002', password: 'Admin@123' });
    amirToken = amirRes.body.token;
  });

  test('BRU-01: Admin creates branch', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'East Branch', address: '789 East St', timing: '9am-1pm' });

    expect(res.statusCode).toBe(201);
    expect(res.body.branch.name).toBe('East Branch');
  });

  test('BRU-02: Non-admin cannot create branch', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ name: 'West Branch', address: 'West St' });

    expect(res.statusCode).toBe(403);
  });

  test('BRU-03: Assign teacher to branch', async () => {
    // Get teacher 2 ID
    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const teacher2 = usersRes.body.find(u => u.phone === '9825920189');

    const res = await request(app)
      .put('/api/branches/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Central Branch', address: '123 Main St', teacher_id: teacher2.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.teacher_id).toBe(teacher2.id);
  });

  test('BRU-04: One teacher, one branch enforced', async () => {
    // Attempt assigning Teacher 1 (already assigned to Branch 1) to Branch 2
    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const teacher1 = usersRes.body.find(u => u.phone === '9000000004');

    const res = await request(app)
      .put('/api/branches/2')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'North Branch', address: '456 North St', teacher_id: teacher1.id });

    // Blocked outright with error
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already assigned/i);
  });

  test('BRU-05: Assign supervisor to multiple branches', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2); // Mapped to both Branch 1 and 2 in seed
  });

  test('BRU-06: Assign amir to multiple branches', async () => {
    const res = await request(app)
      .get('/api/branches')
      .set('Authorization', `Bearer ${amirToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2); // Mapped to both Branch 1 and 2 in seed
  });

  test('BRU-07: Unassign supervisor/amir', async () => {
    // Unassign supervisor from branch 2
    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const supervisor = usersRes.body.find(u => u.role === 'supervisor');

    const res = await request(app)
      .delete(`/api/branches/2/supervisors/${supervisor.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 204]).toContain(res.statusCode);
  });

  test('BRU-08: Admin creates user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Teacher', phone: '9900011122', email: 'newteacher@test.com', password: 'Password123', role: 'teacher' });

    expect(res.statusCode).toBe(201);
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('BRU-09: Deactivate user (soft delete)', async () => {
    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const teacher2 = usersRes.body.find(u => u.phone === '9825920189');

    const res = await request(app)
      .delete(`/api/users/${teacher2.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  test('BRU-10: Inactive user cannot log in', async () => {
    const usersRes = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    const teacher2 = usersRes.body.find(u => u.phone === '9825920189');

    // Deactivate
    await request(app).delete(`/api/users/${teacher2.id}`).set('Authorization', `Bearer ${adminToken}`);

    // Try login
    const loginRes = await request(app).post('/api/auth/login').send({ phone: '9825920189', password: 'Admin@123' });
    expect(loginRes.statusCode).toBe(401);
  });

  test('BRU-11: Supervisor sees only assigned branches', async () => {
    const res = await request(app).get('/api/branches').set('Authorization', `Bearer ${supervisorToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('BRU-12: Amir sees only assigned branches', async () => {
    const res = await request(app).get('/api/branches').set('Authorization', `Bearer ${amirToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
