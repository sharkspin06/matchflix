export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;

// Session storage key for a Google sign-up started on the login page
export const GOOGLE_SIGNUP_KEY = 'googleSignup';
