import axios from 'axios';
const API_BASE_URL =  'http://localhost:57214/';
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';
/**
 * Validate SSO token with backend
 * @param {string} token - SSO token from URL parameter
 * @returns {Promise<Object>} Validation response with user data
 */
export const validateToken = async (token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/validate-token`, {
      token: token
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: false
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        userId: response.data.userId,
        userName: response.data.userName,
        email: response.data.email,
        message: 'Token validated successfully'
      };
    } else {
      return {
        success: false,
        message: response.data?.message || 'Token validation failed'
      };
    }
  } catch (error) {
    console.error('Token validation error:', error);
    
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'Server error during validation',
        statusCode: error.response.status
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from authentication server'
      };
    } else {
      return {
        success: false,
        message: error.message || 'Token validation failed'
      };
    }
  }
};

/**
 * Set authentication token in axios defaults and localStorage
 * @param {string} token - Authentication token
 */
export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
    localStorage.setItem('authTokenTime', new Date().getTime().toString());
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenTime');
  }
};

/**
 * Get stored authentication token
 * @returns {string|null} Stored token or null
 */
export const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    const tokenTime = localStorage.getItem('authTokenTime');
    if (tokenTime) {
      const elapsed = Date.now() - parseInt(tokenTime);
      const oneHour = 60 * 60 * 1000;
      
      if (elapsed > oneHour) {
        logout();
        return null;
      }
    }
  }
  return token;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
export const isAuthenticated = () => {
  return getAuthToken() !== null;
};

/**
 * Get stored user information
 * @returns {Object|null} User object or null
 */
export const getUserInfo = () => {
  const userName = localStorage.getItem('userName');
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');
  
  if (userName && userId) {
    return {
      name: userName,
      id: userId,
      email: userEmail
    };
  }
  
  return null;
};

/**
 * Store user information in localStorage
 * @param {Object} user - User object with name, id, email
 */
export const setUserInfo = (user) => {
  if (user) {
    localStorage.setItem('userName', user.name || '');
    localStorage.setItem('userId', user.id || '');
    if (user.email) {
      localStorage.setItem('userEmail', user.email);
    }
  }
};
export const logout = () => {
  setAuthToken(null);
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.clear();
};

/**
 * Refresh token (if your backend supports token refresh)
 * @returns {Promise<boolean>} True if refresh successful
 */
export const refreshToken = async () => {
  try {
    const currentToken = getAuthToken();
    if (!currentToken) {
      return false;
    }
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      token: currentToken
    });
    if (response.data && response.data.success) {
      setAuthToken(response.data.newToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshed = await refreshToken();
       if (refreshed) {
          return axios(originalRequest);
        } else {
          logout();
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
};
setupAxiosInterceptors();

export default {
  validateToken,
  setAuthToken,
  getAuthToken,
  isAuthenticated,
  getUserInfo,
  setUserInfo,
  logout,
  refreshToken,
  setupAxiosInterceptors
};