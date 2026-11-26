import api from './api';

const data = (r) => r.data.data;

export const login = (email, password) => api.post('/auth/login', { email, password }).then(data);
export const getMe = () => api.get('/auth/me').then(data);

export const getStats = () => api.get('/admin/stats').then(data);
export const listEnquiries = (params) => api.get('/admin/enquiries', { params }).then(data);
export const getEnquiry = (id) => api.get(`/admin/enquiries/${id}`).then(data);
export const updateStatus = (id, status, note) => api.patch(`/admin/enquiries/${id}/status`, { status, note }).then(data);

export const getQuotationDefaults = () => api.get('/admin/quotation-defaults').then(data);
export const saveQuotation = (id, body) => api.put(`/admin/enquiries/${id}/quotation`, body).then(data);
export const approveQuotation = (id) => api.post(`/admin/enquiries/${id}/quotation/approve`).then(data);
export const sendQuotation = (id) => api.post(`/admin/enquiries/${id}/quotation/send`).then(data);

/** Downloads the PDF through the authenticated API and triggers a browser save. */
export async function downloadQuotationPdf(id) {
  const res = await api.get(`/admin/enquiries/${id}/quotation/pdf`, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'quotation.pdf';
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
