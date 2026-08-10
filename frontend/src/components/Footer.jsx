import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div>
          <div className="footer-brand">Jamaat-e-Islami Hind</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.2rem' }}>
            Sewing Classes Management System &bull; Training & Empowerment Division
          </div>
        </div>

        <div className="footer-links-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <div className="footer-links">
            <span>Official NGO Portal</span>
            <span>&bull;</span>
            <span>Restricted Authorized Access</span>
            <span>&bull;</span>
            <span>© {new Date().getFullYear()} JIH</span>
          </div>
          <div style={{ fontSize: '0.70rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400, letterSpacing: '0.02em' }}>
            System built by Axiom Technologies
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
