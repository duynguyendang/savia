import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://savia-backend-180036253374.us-central1.run.app';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    const isAdmin = localStorage.getItem('admin_mode') === 'true';
    
    console.log('API Request:', {
        url: config.url,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey.substring(0, 5),
        isAdmin: isAdmin
    });
    
    if (apiKey) {
        config.headers['X-Gemini-Api-Key'] = apiKey;
    }
    if (isAdmin) {
        config.headers['X-Admin-Mode'] = 'true';
    }
    
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.status, error.response?.data);
        let msg = 'Connection failed';
        if (error.response?.status === 401) {
            msg = 'API key not configured. Please add your key in Settings.';
        } else if (error.response?.data?.message) {
            msg = error.response.data.message;
        } else if (error.message) {
            msg = error.message;
        }
        throw new Error(msg);
    }
);
