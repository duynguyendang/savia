import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://savia-backend-180036253374.us-central1.run.app';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.status, error.response?.data);
        let msg = 'Connection failed';
        if (error.response?.status === 401) {
            msg = 'API key not configured. Please contact administrator.';
        } else if (error.response?.data?.error) {
            msg = error.response.data.error;
        } else if (error.response?.data?.message) {
            msg = error.response.data.message;
        } else if (error.message) {
            msg = error.message;
        }
        throw new Error(msg);
    }
);
