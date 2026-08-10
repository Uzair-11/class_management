import React from 'react';

/**
 * Reusable Loading Button component that handles inline loading states,
 * prevents duplicate clicks/submissions, and maintains existing skeuomorphic button styling.
 */
const LoadingButton = ({
  children,
  loading = false,
  loadingText = 'Processing... ⟳',
  disabled = false,
  onClick,
  type = 'button',
  variant = 'default', // 'default', 'primary', 'black', 'danger', 'sm'
  className = '',
  style = {},
  title
}) => {
  // Map variant to existing button CSS classes
  const getButtonClass = () => {
    let classes = ['btn'];
    if (variant === 'primary') classes.push('btn-primary');
    else if (variant === 'black') classes.push('btn-black');
    else if (variant === 'danger') classes.push('btn-danger');
    else if (variant === 'sm') classes.push('btn-sm');

    if (className) classes.push(className);
    return classes.join(' ');
  };

  const handleClick = (e) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled || loading}
      title={title}
      style={{
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.75 : 1,
        transition: 'all 0.15s ease',
        position: 'relative',
        ...style
      }}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="btn-spinner" aria-hidden="true">⟳</span>
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
