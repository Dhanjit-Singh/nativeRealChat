import axios from 'axios';

const api = axios.create({
    baseURL: "https://real-chat-backend-c3nm.onrender.com",
    // timeout: 10000,
});

export default api;