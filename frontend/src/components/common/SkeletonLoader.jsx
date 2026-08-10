import React from 'react';

/**
 * Skeleton Loader Component
 * Renders pulse animations structured like the target content to avoid full-screen spinners or blank screens.
 */
const SkeletonLoader = ({ type = 'table', rows = 4, columns = 4, style = {} }) => {
  if (type === 'table') {
    return (
      <div className="table-responsive" style={{ overflow: 'hidden', ...style }}>
        <table className="plain-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, idx) => (
                <th key={`sk-th-${idx}`}>
                  <div className="skeleton-bar" style={{ width: '70%', height: '14px' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={`sk-tr-${rIdx}`}>
                {Array.from({ length: columns }).map((_, cIdx) => (
                  <td key={`sk-td-${rIdx}-${cIdx}`}>
                    <div className="skeleton-bar" style={{ width: cIdx === 0 ? '40%' : cIdx === 1 ? '85%' : '60%', height: '16px' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'card-grid' || type === 'dashboard') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', ...style }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={`sk-card-${idx}`} className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-border)' }}>
            <div className="skeleton-bar" style={{ width: '40%', height: '12px', marginBottom: '0.75rem' }} />
            <div className="skeleton-bar" style={{ width: '60%', height: '24px', marginBottom: '0.5rem' }} />
            <div className="skeleton-bar" style={{ width: '80%', height: '10px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="card" style={{ padding: '1.5rem', ...style }}>
        <div className="skeleton-bar" style={{ width: '35%', height: '22px', marginBottom: '1.25rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div className="skeleton-bar" style={{ width: '30%', height: '12px', marginBottom: '0.4rem' }} />
            <div className="skeleton-bar" style={{ width: '70%', height: '18px' }} />
          </div>
          <div>
            <div className="skeleton-bar" style={{ width: '30%', height: '12px', marginBottom: '0.4rem' }} />
            <div className="skeleton-bar" style={{ width: '70%', height: '18px' }} />
          </div>
          <div>
            <div className="skeleton-bar" style={{ width: '30%', height: '12px', marginBottom: '0.4rem' }} />
            <div className="skeleton-bar" style={{ width: '70%', height: '18px' }} />
          </div>
        </div>
        <div className="skeleton-bar" style={{ width: '100%', height: '120px' }} />
      </div>
    );
  }

  // Default text lines skeleton
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...style }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={`sk-line-${idx}`}
          className="skeleton-bar"
          style={{ width: `${100 - (idx % 3) * 15}%`, height: '16px' }}
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;
