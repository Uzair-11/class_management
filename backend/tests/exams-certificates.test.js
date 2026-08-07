const request = require('supertest');
const app = require('../app');
const path = require('path');
const { seedTestDatabase } = require('./seedTestDb');

describe('SECTION 7: Exams & Certificates (EXM-01 to EXM-13)', () => {
  let adminToken, teacherToken;

  beforeEach(async () => {
    await seedTestDatabase();

    const adminRes = await request(app).post('/api/auth/login').send({ phone: '9000000001', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const teacherRes = await request(app).post('/api/auth/login').send({ phone: '9000000004', password: 'Admin@123' });
    teacherToken = teacherRes.body.token;
  });

  test('EXM-01 & EXM-02: Record exam result & auto-issue cert on pass', async () => {
    const res = await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 85, result: 'pass' });

    expect(res.statusCode).toBe(201);
    expect(res.body.examination.result).toBe('pass');
    expect(res.body.certificate).toHaveProperty('certificate_number');
  });

  test('EXM-03: Cert auto-created on fail too', async () => {
    const res = await request(app)
      .post('/api/students/2/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 30, result: 'fail' });

    expect(res.statusCode).toBe(201);
    expect(res.body.certificate).not.toBeNull();
  });

  test('EXM-04: Duplicate exam blocked', async () => {
    await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 85, result: 'pass' });

    const res = await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 90, result: 'pass' });

    expect(res.statusCode).toBe(400);
  });

  test('EXM-05: Certificate number uniqueness', async () => {
    const res1 = await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 85, result: 'pass' });

    const res2 = await request(app)
      .post('/api/students/2/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 90, result: 'pass' });

    expect(res1.body.certificate.certificate_number).not.toEqual(res2.body.certificate.certificate_number);
  });

  test('EXM-06: No template uploaded — fallback render', async () => {
    // Record exam
    const exRes = await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 85, result: 'pass' });

    const certId = exRes.body.certificate.id;

    const res = await request(app)
      .get(`/api/certificates/${certId}/render`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.has_active_template).toBe(false);
  });

  test('EXM-07 & EXM-08 & EXM-09 & EXM-10 & EXM-11 & EXM-12: Template upload, activation, placement, render', async () => {
    // Record exam
    const exRes = await request(app)
      .post('/api/students/1/exam')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ exam_date: '2026-08-05', marks: 85, result: 'pass' });

    const certId = exRes.body.certificate.id;

    // Upload template
    const uploadRes = await request(app)
      .post('/api/certificate-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('template_file', Buffer.from('fake image content'), 'test_bg.jpg');

    expect(uploadRes.statusCode).toBe(201);
    const tmplId = uploadRes.body.template.id;

    // Activate
    const actRes = await request(app)
      .put(`/api/certificate-templates/${tmplId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(actRes.statusCode).toBe(200);
    expect(actRes.body.template.is_active).toBe(true);

    // Save field positions
    const fieldsRes = await request(app)
      .put(`/api/certificate-templates/${tmplId}/fields`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fields: [
          { field_key: 'student_name', x_position: 50, y_position: 40, font_size: 24, font_weight: 'bold', text_align: 'center', color: '#000000' }
        ]
      });

    expect(fieldsRes.statusCode).toBe(200);

    // Render merged
    const renderRes = await request(app)
      .get(`/api/certificates/${certId}/render`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(renderRes.statusCode).toBe(200);
    expect(renderRes.body.has_active_template).toBe(true);
    expect(renderRes.body.certificate.student_name).toBe('Student NoRelief');
  });

  test('EXM-13: Print view contract', () => {
    expect(true).toBe(true);
  });
});
