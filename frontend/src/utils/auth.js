export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

export const getToken = () => localStorage.getItem('token');