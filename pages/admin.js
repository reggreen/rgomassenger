import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboard from '../components/AdminDashboard';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="moderator" fallbackTitle="অ্যাডমিন ও মডারেটর কন্ট্রোল প্যানেল">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
