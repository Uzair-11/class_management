import React from 'react';
import { parseError } from '../../utils/errorHandler';

/**
 * Reusable Inline Error Box for Form fields or inline component errors
 */
export const InlineError = ({ message, onDismiss, style = {} }) => {
  if (!message) return null;
  const parsed = typeof message === 'string' ? { reason: message } : parseError(message);

  return (
    <div
      className="error-box"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
        margin: '0.75rem 0',
        padding: '0.75rem 1rem',
        fontSize: '0.85rem',
        ...style
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span>⚠️</span>
        <span>{parsed.reason}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
          title="Dismiss"
        >
          &times;
        </button>
      )}
    </div>
  );
};

/**
 * Full Section / Page Error State fulfilling the 3-Question Rule:
 * 1. What happened?
 * 2. Why?
 * 3. What should you do next? (+ Retry Button)
 */
const ErrorState = ({
  error,
  onRetry,
  retryText = 'Try Again',
  title: customTitle,
  message: customMessage,
  style = {}
}) => {
  if (!error && !customTitle && !customMessage) return null;

  const parsed = parseError(error);
  const title = customTitle || parsed.title;
  const reason = customMessage || parsed.reason;
  const action = parsed.action;

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'rgba(198, 61, 47, 0.04)',
        border: '1px solid rgba(198, 61, 47, 0.3)',
        borderLeft: '5px solid var(--color-danger)',
        padding: '1.75rem',
        margin: '1.5rem 0',
        ...style
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '1.8rem', color: 'var(--color-danger)', lineHeight: 1 }}>
          ⚠️
        </div>
        <div style={{ flex: 1 }}>
          {/* Question 1: What happened? */}
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-danger)', marginBottom: '0.4rem' }}>
            {title}
          </h3>

          {/* Question 2: Why? */}
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '0.6rem', lineHeight: '1.5' }}>
            <strong>Why this occurred:</strong> {reason}
          </p>

          {/* Question 3: What should the user do next? */}
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            💡 <strong>Suggested action:</strong> {action}
          </p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-danger btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>🔄</span>
              <span>{retryText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
