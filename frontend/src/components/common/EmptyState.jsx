import React from 'react';

/**
 * Reusable Empty State component that clearly differentiates between:
 * - Zero records existing in system/branch ('no-data')
 * - Search query / filters yielding zero matches ('no-results')
 */
const EmptyState = ({
  type = 'no-data', // 'no-data' | 'no-results'
  title,
  message,
  actionText,
  onAction,
  icon,
  style = {}
}) => {
  const isNoResults = type === 'no-results';

  const defaultTitle = isNoResults ? 'No Matching Records Found' : 'No Records Available Yet';
  const defaultMessage = isNoResults
    ? 'We couldn\'t find any items matching your current search term or filter criteria.'
    : 'There are currently no items recorded in this section.';
  const defaultIcon = isNoResults ? '🔍' : '📁';

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        margin: '1.5rem 0',
        backgroundColor: '#FAFCFB',
        border: '1px dashed var(--color-border)',
        boxShadow: 'none',
        ...style
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.8 }}>
        {icon || defaultIcon}
      </div>
      
      <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary-dark)', marginBottom: '0.35rem' }}>
        {title || defaultTitle}
      </h3>
      
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '460px', margin: '0 auto 1.25rem' }}>
        {message || defaultMessage}
      </p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`btn ${isNoResults ? '' : 'btn-black'}`}
          style={{ minWidth: '140px' }}
        >
          {actionText || (isNoResults ? 'Reset Filters / Clear Search' : '+ Add New Record')}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
