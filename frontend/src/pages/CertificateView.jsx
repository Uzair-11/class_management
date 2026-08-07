import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../../../logo_reverse.png';

const CertificateView = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [renderData, setRenderData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRenderData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:5000/api/certificates/${id}/render`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setRenderData(data);
        } else {
          setError(data.message || 'Certificate not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRenderData();
  }, [id, token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>🔄 Rendering Certificate...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div className="error-box">{error}</div>
        <button onClick={() => navigate(-1)} className="btn">Back</button>
      </div>
    );
  }

  const { has_active_template, template, fields, certificate } = renderData || {};

  // Value map for field keys
  const getFieldValue = (key) => {
    if (!certificate) return '';
    switch (key) {
      case 'student_name': return certificate.student_name;
      case 'course_name': return `${certificate.course_name} (${certificate.duration_months} Months)`;
      case 'branch_name': return certificate.branch_name;
      case 'result': return `${(certificate.exam_result || 'Pass').toUpperCase()} ${certificate.exam_marks ? `(${certificate.exam_marks} Marks)` : ''}`;
      case 'certificate_number': return certificate.certificate_number;
      case 'issue_date': return new Date(certificate.issue_date).toLocaleDateString();
      default: return '';
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Admin Fallback Notice */}
      {user?.role === 'admin' && !has_active_template && (
        <div className="card status-warning" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <strong>ℹ️ Admin Notice:</strong> No custom certificate template is currently active. Using default institutional layout.
        </div>
      )}

      {/* Controls Bar (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} className="btn">
          &larr; Back
        </button>
        <button onClick={handlePrint} className="btn btn-black">
          🖨️ Print Certificate
        </button>
      </div>

      {/* Render Active Template Overlay OR Fallback Layout */}
      {has_active_template && template ? (
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${template.background_width} / ${template.background_height}`,
          backgroundColor: '#ffffff',
          border: '2px solid var(--color-border)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}>
          {template.file_type === 'image' ? (
            <img
              src={`http://localhost:5000${template.file_path}`}
              alt="Certificate Template"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <iframe
              src={`http://localhost:5000${template.file_path}`}
              title="Certificate Template PDF"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}

          {/* Overlaid Dynamic Fields */}
          {fields && fields.map(f => (
            <div
              key={`rfl-${f.field_key}`}
              style={{
                position: 'absolute',
                left: `${f.x_position}%`,
                top: `${f.y_position}%`,
                transform: f.text_align === 'center' ? 'translate(-50%, -50%)' : f.text_align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                fontSize: `${f.font_size * 0.75}px`,
                fontWeight: f.font_weight,
                color: f.color,
                textAlign: f.text_align,
                whiteSpace: 'nowrap'
              }}
            >
              {getFieldValue(f.field_key)}
            </div>
          ))}
        </div>
      ) : (
        /* Fallback Plain Institutional Layout */
        <div style={{
          border: '4px double var(--color-primary-dark)',
          backgroundColor: '#ffffff',
          textAlign: 'center',
          color: 'var(--color-text)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-primary-dark)',
            padding: '1.5rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff'
          }}>
            <img src={logoImg} alt="Jamaat-e-Islami Hind Logo" style={{ height: '48px', width: 'auto' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                Jamaat-e-Islami Hind
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
                Sewing Classes Management System
              </div>
            </div>
          </div>

          <div style={{ padding: '2.5rem 2.5rem 3rem 2.5rem' }}>
            <h1 style={{ fontSize: '2.4rem', textTransform: 'uppercase', letterSpacing: '3px', margin: '0.5rem 0 1.5rem 0', fontFamily: 'Georgia, serif', color: 'var(--color-primary-dark)' }}>
              Certificate of Completion
            </h1>

            <p style={{ fontSize: '1rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', margin: '1rem 0 0.5rem 0' }}>
              This is to certify that
            </p>

            <h2 style={{ fontSize: '2rem', borderBottom: '2px solid var(--color-primary)', display: 'inline-block', padding: '0 2.5rem 0.35rem 2.5rem', margin: '0.5rem 0 1.5rem 0', color: 'var(--color-text)' }}>
              {certificate?.student_name}
            </h2>

            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', maxWidth: '640px', margin: '0 auto 2.5rem auto' }}>
              has successfully completed the <strong>{certificate?.course_name}</strong> ({certificate?.duration_months} Months) training program at the <strong>{certificate?.branch_name}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', textAlign: 'left', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', fontSize: '0.88rem' }}>
              <div>
                <p><strong>Certificate No:</strong> <code>{certificate?.certificate_number}</code></p>
                <p><strong>Issue Date:</strong> {certificate?.issue_date ? new Date(certificate.issue_date).toLocaleDateString() : '-'}</p>
                <p>
                  <strong>Exam Result:</strong>{' '}
                  <span className="badge-outline badge-success" style={{ fontWeight: 'bold' }}>
                    {certificate?.exam_result || 'PASS'}
                  </span>{' '}
                  {certificate?.exam_marks ? `(${certificate.exam_marks} Marks)` : ''}
                </p>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ borderBottom: '1px solid var(--color-text)', width: '180px', marginLeft: 'auto', marginBottom: '0.35rem' }}></div>
                <p style={{ fontWeight: 'bold' }}>Authorized Signatory</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Jamaat-e-Islami Hind Training Division</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Override */}
      <style>{`
        @media print {
          .no-print, .navbar, .footer { display: none !important; }
          body { background: white !important; }
          .page-container { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

export default CertificateView;
