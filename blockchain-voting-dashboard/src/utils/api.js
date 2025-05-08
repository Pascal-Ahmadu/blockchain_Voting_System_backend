import axios from "axios";

const API_BASE_URL = "https://blockchain-voting-system-backend.onrender.com"; // Flask backend URL

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Store the session token - UPDATED to use authToken
let sessionToken = localStorage.getItem('authToken') || null;

apiClient.interceptors.request.use(
    config => {
      console.log(`Request: ${config.method.toUpperCase()} ${config.url}`);
      
      // Always get the latest token from localStorage - UPDATED
      const currentToken = syncTokenState();
      
      // Ensure session token is included in request headers
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
  
      // Add session token to request body if needed
      if (currentToken && config.data && typeof config.data === 'object') {
        config.data.sessionToken = currentToken;
      }
  
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

// Handle responses and session expiration
apiClient.interceptors.response.use(
  response => {
    console.log(`Response: ${response.status} ${response.statusText}`);
    return response;
  },
  error => {
    if (error.response) {
      console.error(`API Error: ${error.response.status}`, error.response.data);
      
      // Handle session expiration
      if (error.response.status === 401 || error.response.data?.sessionLost) {
        console.log("Session expired. Redirecting to login.");
        
        // Clear session token - UPDATED
        sessionToken = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('walletAddress');
        
        // Dispatch event to handle session loss
        window.dispatchEvent(new CustomEvent('session:lost'));
      }
    }

    return Promise.reject(error);
  }
);

// ================================================
// 🔹 AUTHENTICATION API CALLS
// ================================================

export const getNonce = async (walletAddress) => {
  const response = await apiClient.post('/api/nonce', { walletAddress });
  
  // Save the session token for future requests - UPDATED
  sessionToken = response.data.sessionToken;
  localStorage.setItem('authToken', sessionToken);
  
  return response;
};

// In api.js, update verifySignature function
export const verifySignature = async (walletAddress, signature) => {
    const response = await apiClient.post('/api/verify', { 
      walletAddress, 
      signature,
      sessionToken 
    });
    return response;
  };

// In api.js
// Update the checkAuth function
export const checkAuth = async () => {
    // Get the token directly from localStorage each time - UPDATED
    const localToken = localStorage.getItem('authToken');
    
    if (!localToken) {
      return { data: { authenticated: false } };
    }
    
    // Make sure the memory variable is in sync with localStorage
    sessionToken = localToken;
    
    try {
      const response = await apiClient.post('/api/check-auth', { sessionToken });
      return response;
    } catch (error) {
      // If the auth check fails, clear the session
      clearSession();
      return { data: { authenticated: false } };
    }
  };

// ================================================
// 🔹 VOTING API CALLS
// ================================================

export const getCandidates = async () => {
  return apiClient.get('/candidates');
};

// ================================================
// 🔹 ADMIN API CALLS (Only Admins Can Use These)
// ================================================

export const addCandidate = async (name) => {
  return apiClient.post('/admin/add_candidate', { name, sessionToken });
};

export const startVoting = async () => {
  return apiClient.post('/admin/start_voting', { sessionToken });
};

export const endVoting = async () => {
  return apiClient.post('/admin/end_voting', { sessionToken });
};

export const getResults = async () => {
    return apiClient.get('/results');
  };

// ================================================
// 🔹 SESSION MANAGEMENT
// ================================================

export const clearSession = () => {
  sessionToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('walletAddress');
};

export const refreshSession = async () => {
    clearSession();
    // Force user to reconnect wallet
    window.location.href = '/';
  };

// Add this to api.js
export const debugTokenState = () => {
    const localToken = localStorage.getItem('authToken');
    console.log("Current token state:");
    console.log("- From localStorage:", localToken);
    console.log("- From memory variable:", sessionToken);
    console.log("- Length comparison:", localToken?.length, sessionToken?.length);
    
    // Check if tokens match
    if (localToken !== sessionToken) {
      console.warn("⚠️ TOKEN MISMATCH! localStorage and memory variable differ");
    }
    
    return { localToken, memoryToken: sessionToken };
  };

const syncTokenState = () => {
    const localToken = localStorage.getItem('authToken');
    sessionToken = localToken;
    return localToken;
  };

export const isValidSession = async () => {
    const currentToken = syncTokenState();
    
    if (!currentToken) {
      return false;
    }
    
    try {
      const response = await apiClient.post('/api/check-auth', { 
        sessionToken: currentToken 
      });
      return response.data.authenticated === true;
    } catch (error) {
      return false;
    }
  };

export const ensureValidSessionToken = async () => {
    // Check if we have a token in localStorage - UPDATED
    const localToken = localStorage.getItem('authToken');
    
    // Check if we have a token in the Supabase session
    const supabaseToken = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.currentSession?.access_token;
    
    // Debug the token state
    console.log("Session token check:", { 
      localToken: localToken ? "Present" : "Missing", 
      supabaseToken: supabaseToken ? "Present" : "Missing"
    });
    
    // Case 1: We have a valid local token
    if (localToken) {
      // Update the in-memory token to match localStorage
      sessionToken = localToken;
      return true;
    }
    
    // Case 2: We have a Supabase token but no local token
    if (supabaseToken && !localToken) {
      // Use Supabase token as our session token
      sessionToken = supabaseToken;
      localStorage.setItem('authToken', supabaseToken);
      console.log("Restored session token from Supabase");
      return true;
    }
    
    // Case 3: No valid token found
    console.warn("No valid session token found");
    return false;
  };

  export const registerVoter = async (walletAddress) => {
    return apiClient.post('/register-voter', { walletAddress });
  };
  
  
// Modify the castVote function to use our new check
export const castVote = async (candidateId) => {
    // First ensure we have a valid token
    const isValid = await ensureValidSessionToken();
    
    if (!isValid) {
      throw new Error("No session token found, please log in again.");
    }
    
    // Get the current token state
    const currentToken = syncTokenState();
    
    console.log("Casting vote with token:", currentToken ? "Present" : "Missing");
    
    return apiClient.post('/vote', { 
      candidateId, 
      sessionToken: currentToken 
    });
  };
export default apiClient;