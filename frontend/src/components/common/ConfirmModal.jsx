import React from 'react';
import LoadingButton from './LoadingButton';

/**
 * Reusable Confirmation Dialog for Destructive / Critical Actions
 * Prevents accidental actions and displays explicit loading/status during execution.
 */
const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  warningText = 'This action cannot be undone.',
  confirmText = 'Confirm & Proceed',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="skeuocard"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderTop: confirmVariant === 'danger' ? '5px solid var(--color-danger)' : '5px solid var(--color-primary)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
          padding: '1.75rem',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '1.5rem' }}>
            {confirmVariant === 'danger' ? '⚠️' : '❓'}
          </span>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-dark)', margin: 0 }}>
            {title}
          </h3>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--color-text)', marginBottom: '0.5rem', lineHeight: '1.5' }}>
          {message}
        </p>

        {warningText && (
          <div
            style={{
              fontSize: '0.82rem',
              color: confirmVariant === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)',
              backgroundColor: confirmVariant === 'danger' ? 'rgba(198, 61, 47, 0.08)' : 'rgba(217, 142, 44, 0.1)',
              border: `1px solid ${confirmVariant === 'danger' ? 'rgba(198, 61, 47, 0.25)' : 'rgba(217, 142, 44, 0.3)'}`,
              padding: '0.55rem 0.85rem',
              borderRadius: '6px',
              fontWeight: '600',
              marginBottom: '1.5rem'
            }}
          >
            📌 {warningText}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <LoadingButton
            variant={confirmVariant}
            loading={loading}
            loadingText="Processing... ⟳"
            onClick={onConfirm}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
