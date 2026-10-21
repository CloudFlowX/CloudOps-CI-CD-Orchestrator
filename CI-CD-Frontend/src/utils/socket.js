export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    // Strip trailing /api/v1 or /api
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return "http://localhost:5002";
};
