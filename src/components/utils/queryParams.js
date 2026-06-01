/**
 * Get query parameters from URL
 * @returns {Object} Object with all query parameters
 */
export const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  const queryParams = {};
  
  for (const [key, value] of params.entries()) {
    queryParams[key] = value;
  }
  
  return queryParams;
};

/**
 * Get specific query parameter
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value or null
 */
export const getQueryParam = (UserName) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(UserName);
};

export const clearQueryParams = () => {
  const url = new URL(window.location);
  url.search = '';
  window.history.replaceState({}, '', url);
};