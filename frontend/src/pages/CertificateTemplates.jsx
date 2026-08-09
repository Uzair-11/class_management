import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const CertificateTemplates = () => {
  const { token, user } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Upload Form State
  const [templateName, setTemplateName] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Field Placement State (% based)
  const [fields, setFields] = useState([
    { field_key: 'student_name', label: 'Student Name', sample: 'Ayesha Siddiqui', x_position: 50, y_position: 40, font_size: 24, font_weight: 'bold', text_align: 'center', color: '#000000' },
    { field_key: 'course_name', label: 'Course Name', sample: 'Basic Sewing Course', x_position: 50, y_position: 52, font_size: 18, font_weight: 'bold', text_align: 'center', color: '#0B6E4F' },
    { field_key: 'branch_name', label: 'Branch Name', sample: 'Central Branch', x_position: 50, y_position: 60, font_size: 16, font_weight: 'normal', text_align: 'center', color: '#333333' },
    { field_key: 'result', label: 'Exam Result', sample: 'Pass (85 Marks)', x_position: 25, y_position: 80, font_size: 14, font_weight: 'bold', text_align: 'left', color: '#000000' },
    { field_key: 'certificate_number', label: 'Cert Number', sample: 'CEN-2026-0001', x_position: 25, y_position: 75, font_size: 14, font_weight: 'normal', text_align: 'left', color: '#333333' },
    { field_key: 'issue_date', label: 'Issue Date', sample: '07/08/2026', x_position: 75, y_position: 75, font_size: 14, font_weight: 'normal', text_align: 'right', color: '#333333' }
  ]);

  const [activeFieldKey, setActiveFieldKey] = useState('student_name');
  const previewRef = useRef(null);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/certificate-templates'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates(data);
        const active = data.find(t => t.is_active);
        if (active) {
          setActiveTemplate(active);
          if (!selectedTemplate) {
            setSelectedTemplate(active);
            if (active.fields && active.fields.length > 0) mergeFields(active.fields);
          }
        } else if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
          if (data[0].fields && data[0].fields.length > 0) mergeFields(data[0].fields);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const mergeFields = (savedFields) => {
    setFields(prev => prev.map(f => {
      const sf = savedFields.find(s => s.field_key === f.field_key);
      if (sf) {
        return {
          ...f,
          x_position: parseFloat(sf.x_position),
          y_position: parseFloat(sf.y_position),
          font_size: parseInt(sf.font_size),
          font_weight: sf.font_weight,
          text_align: sf.text_align,
          color: sf.color
        };
      }
      return f;
    }));
  };

  useEffect(() => {
    fetchTemplates();
  }, [token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a template image or PDF file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setMsg('');

    const formData = new FormData();
    formData.append('template_file', file);
    if (templateName) formData.append('name', templateName);

    try {
      const res = await fetch(buildApiUrl('/api/certificate-templates'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setMsg('Template uploaded successfully!');
      setTemplateName('');
      setFile(null);
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (id) => {
    setError('');
    setMsg('');
    try {
      const res = await fetch(buildApiUrl(`/api/certificate-templates/${id}/activate`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Activation failed');

      setMsg('Certificate template activated successfully!');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveFields = async () => {
    if (!selectedTemplate) return;
    setError('');
    setMsg('');

    try {
      const res = await fetch(buildApiUrl(`/api/certificate-templates/${selectedTemplate.id}/fields`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fields })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save field positions');

      setMsg('Field positions and styling saved successfully!');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectTemplate = (t) => {
    setSelectedTemplate(t);
    if (t.fields && t.fields.length > 0) {
      mergeFields(t.fields);
    }
  };

  // Dragging logic for percentage positioning
  const handleDragLabel = (fieldKey, e) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
    const clampedY = Math.max(0, Math.min(100, Math.round(y * 10) / 10));

    setFields(prev => prev.map(f => f.field_key === fieldKey ? { ...f, x_position: clampedX, y_position: clampedY } : f));
  };

  const activeFieldObj = fields.find(f => f.field_key === activeFieldKey);

  const updateActiveFieldStyle = (key, val) => {
    setFields(prev => prev.map(f => f.field_key === activeFieldKey ? { ...f, [key]: val } : f));
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Certificate Template Manager</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Upload custom background designs and visually position student text fields
          </p>
        </div>
      </div>

      {msg && <div style={{ border: '1px solid var(--color-primary)', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-primary-light)' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Upload Card */}
        <div className="card">
          <h3>Upload New Template File</h3>
          <form onSubmit={handleUpload} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Template Name</label>
              <input
                type="text"
                className="form-input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. 2026 Official Crest Certificate"
              />
            </div>

            <div className="form-group">
              <label>Background File (Image JPG/PNG or PDF) *</label>
              <input
                type="file"
                className="form-input"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>

            <button type="submit" className="btn btn-black" disabled={uploading}>
              {uploading ? 'Uploading...' : '📤 Upload Template'}
            </button>
          </form>
        </div>

        {/* Template List Card */}
        <div className="card">
          <h3>Uploaded Certificate Templates</h3>
          <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '220px', overflowY: 'auto' }}>
            <table className="plain-table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No templates uploaded yet</td>
                  </tr>
                ) : (
                  templates.map(t => (
                    <tr key={`tmpl-${t.id}`} style={{ backgroundColor: selectedTemplate?.id === t.id ? 'var(--color-primary-light)' : 'transparent' }}>
                      <td><strong>{t.name}</strong></td>
                      <td><span className="badge-outline" style={{ textTransform: 'uppercase' }}>{t.file_type}</span></td>
                      <td>
                        {t.is_active ? (
                          <span className="badge-outline status-good">
                            ★ ACTIVE
                          </span>
                        ) : (
                          <span className="badge-outline" style={{ color: 'var(--color-text-secondary)' }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleSelectTemplate(t)} className="btn btn-sm">
                            Edit
                          </button>
                          {!t.is_active && (
                            <button onClick={() => handleActivate(t.id)} className="btn btn-sm btn-black">
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visual Drag-and-Position Editor */}
      {selectedTemplate && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3>Visual Field Placement Editor: {selectedTemplate.name}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                Drag text labels directly over the background design to position student fields accurately (% based)
              </p>
            </div>
            <button onClick={handleSaveFields} className="btn btn-black">
              💾 Save Field Positions & Styles
            </button>
          </div>

          {/* Style Controls Bar per Field */}
          {activeFieldObj && (
            <div className="card" style={{ backgroundColor: 'var(--color-background)', marginBottom: '1rem', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  Editing [{activeFieldObj.label}]:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Font Size:</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '70px', padding: '0.2rem 0.4rem' }}
                    value={activeFieldObj.font_size}
                    onChange={(e) => updateActiveFieldStyle('font_size', parseInt(e.target.value || 12))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Weight:</label>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '0.2rem 0.4rem' }}
                    value={activeFieldObj.font_weight}
                    onChange={(e) => updateActiveFieldStyle('font_weight', e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Align:</label>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '0.2rem 0.4rem' }}
                    value={activeFieldObj.text_align}
                    onChange={(e) => updateActiveFieldStyle('text_align', e.target.value)}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>Color:</label>
                  <input
                    type="color"
                    style={{ cursor: 'pointer', height: '32px', width: '40px', border: '1px solid var(--color-border)' }}
                    value={activeFieldObj.color}
                    onChange={(e) => updateActiveFieldStyle('color', e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  X: {activeFieldObj.x_position}% | Y: {activeFieldObj.y_position}%
                </div>
              </div>
            </div>
          )}

          {/* Visual Canvas */}
          <div 
            ref={previewRef}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '850px',
              margin: '0 auto',
              aspectRatio: `${selectedTemplate.background_width} / ${selectedTemplate.background_height}`,
              backgroundColor: '#e5e5e5',
              border: '2px solid var(--color-border)',
              borderRadius: '6px',
              overflow: 'hidden',
              userSelect: 'none'
            }}
          >
            {selectedTemplate.file_type === 'image' ? (
              <img
                src={buildApiUrl(`${selectedTemplate.file_path}`)}
                alt="Certificate Background"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                src={buildApiUrl(`${selectedTemplate.file_path}`)}
                title="PDF Background"
                style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
              />
            )}

            {/* Draggable Overlaid Sample Fields */}
            {fields.map(f => (
              <div
                key={`fl-${f.field_key}`}
                draggable
                onDragEnd={(e) => handleDragLabel(f.field_key, e)}
                onClick={() => setActiveFieldKey(f.field_key)}
                style={{
                  position: 'absolute',
                  left: `${f.x_position}%`,
                  top: `${f.y_position}%`,
                  transform: f.text_align === 'center' ? 'translate(-50%, -50%)' : f.text_align === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                  fontSize: `${f.font_size * 0.75}px`,
                  fontWeight: f.font_weight,
                  color: f.color,
                  textAlign: f.text_align,
                  cursor: 'move',
                  border: activeFieldKey === f.field_key ? '2px dashed var(--color-primary)' : '1px solid rgba(0,0,0,0.2)',
                  backgroundColor: activeFieldKey === f.field_key ? 'rgba(11, 110, 79, 0.15)' : 'rgba(255,255,255,0.7)',
                  padding: '0.15rem 0.4rem',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  zIndex: activeFieldKey === f.field_key ? 10 : 5
                }}
              >
                {f.sample}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateTemplates;
