import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import RequestPage from './pages/RequestPage';
import ConfirmationPage from './pages/ConfirmationPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import EnquiriesPage from './pages/admin/EnquiriesPage';
import EnquiryDetailPage from './pages/admin/EnquiryDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="request" element={<RequestPage />} />
        <Route path="request/submitted" element={<ConfirmationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="admin/login" element={<LoginPage />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="enquiries/:id" element={<EnquiryDetailPage />} />
      </Route>
    </Routes>
  );
}
