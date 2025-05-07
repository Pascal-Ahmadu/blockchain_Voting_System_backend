import React from 'react';

const ApiErrorDisplay = ({ error, onRetry }) => {
  if (!error) return null;

  // Determine the error message to display
  let errorMessage = "An unexpected error occurred.";
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status;
    
    if (error.response.status === 401 || error.response.data?.sessionLost) {
      console.log("Session expired. Redirecting to login.");
      
      // Clear session token
      sessionToken = null;
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('walletAddress');
      
      // Redirect to login page
      window.location.href = '/';
    }else if (status === 403) {
      errorMessage = "You don't have permission to perform this action.";
    } else if (status === 404) {
      errorMessage = "The requested resource was not found.";
    } else if (status === 409) {
      errorMessage = "You've already cast a vote in this election.";
    } else if (status === 429) {
      errorMessage = "Too many requests. Please try again later.";
    } else if (status >= 500) {
      errorMessage = "Server error. Please try again later.";
    } else {
      // If we have a more specific message from the server, use it
      errorMessage = error.response.data?.message || errorMessage;
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = "No response from server. Please check your connection.";
  } else if (error.message) {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message;
  }

  return (
    <div className="api-error-container">
      <div className="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{errorMessage}</span>
      </div>
      {onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ApiErrorDisplay;