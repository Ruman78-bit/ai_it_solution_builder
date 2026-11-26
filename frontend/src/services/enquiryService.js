import api from './api';

export const getCatalogue = () => api.get('/catalogue').then((r) => r.data.data);

export const analyzeRequirements = (fields) => api.post('/enquiries/analyze', fields).then((r) => r.data.data);

export const submitEnquiry = (payload) => api.post('/enquiries', payload).then((r) => r.data.data);
