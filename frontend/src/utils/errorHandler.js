/**
 * Translates API or Network errors into structured, user-friendly error objects
 * answering the 3 questions:
 * 1. What happened?
 * 2. Why?
 * 3. What should the user do next?
 */
export const parseError = (error, defaultActionText = 'Please check your information and try again.') => {
  if (!error) return null;

  // Handle String error
  if (typeof error === 'string') {
    return {
      title: 'Action Couldn\'t Be Completed',
      reason: error,
      action: defaultActionText
    };
  }

  // Handle Network Error (Fetch failed, server down)
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      title: 'Unable to Connect to Server',
      reason: 'The application couldn\'t reach the JIH backend server. Your device might be offline or the connection timed out.',
      action: 'Please check your internet connection and click Try Again below.'
    };
  }

  // Handle Unauthorized (401)
  if (error.status === 401 || error.message?.includes('Unauthorized') || error.message?.includes('token')) {
    return {
      title: 'Session Expired',
      reason: 'Your login session has expired or is no longer valid.',
      action: 'Please sign in again to continue working.'
    };
  }

  // Handle Forbidden (403)
  if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('Forbidden')) {
    return {
      title: 'Access Denied',
      reason: 'You do not have administrative permission to perform this action.',
      action: 'Please contact your supervisor or administrator if you believe this is an error.'
    };
  }

  // Handle Server Errors (500)
  if (error.status >= 500) {
    return {
      title: 'Server Couldn\'t Complete Request',
      reason: 'A temporary error occurred on the central server while processing your request.',
      action: 'Please wait a moment and try again.'
    };
  }

  // Generic fallback with custom message if available
  const message = error.message || 'An unexpected issue prevented completing this action.';
  
  return {
    title: 'Couldn\'t Complete Operation',
    reason: message,
    action: defaultActionText
  };
};
