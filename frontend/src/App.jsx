import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage/LoginPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import ProjectManagement from './pages/Admin/ProjectManagement';
import ManagerDashboard from './pages/Manager/ManagerDashboard';
import TeamBoard from './pages/Manager/TeamBoard';
import EmployeeDashboard from './pages/Employee/EmployeeDashboard';
import MyTasks from './pages/Employee/MyTasks';

// Role-based route wrapper
function RoleRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user?.role)) {
    // Redirect to the correct dashboard based on role
    const redirectMap = { admin: '/admin', manager: '/manager', employee: '/app' };
    return <Navigate to={redirectMap[user?.role] || '/login'} />;
  }
  return children;
}

// Protected route (any authenticated user)
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}

// Login redirect (already logged in → go to dashboard)
function LoginRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (isAuthenticated) {
    const redirectMap = { admin: '/admin', manager: '/manager', employee: '/app' };
    return <Navigate to={redirectMap[user?.role] || '/app'} />;
  }
  return <LoginPage />;
}

// Root redirect
function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  const redirectMap = { admin: '/admin', manager: '/manager', employee: '/app' };
  return <Navigate to={redirectMap[user?.role] || '/app'} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />
          <Route path="/admin/users" element={<RoleRoute allowedRoles={['admin']}><UserManagement /></RoleRoute>} />
          <Route path="/admin/projects" element={<RoleRoute allowedRoles={['admin']}><ProjectManagement /></RoleRoute>} />
          <Route path="/admin/workflows" element={<RoleRoute allowedRoles={['admin']}><AdminDashboard /></RoleRoute>} />

          {/* Manager Routes */}
          <Route path="/manager" element={<RoleRoute allowedRoles={['manager']}><ManagerDashboard /></RoleRoute>} />
          <Route path="/manager/projects" element={<RoleRoute allowedRoles={['manager']}><ProjectManagement /></RoleRoute>} />
          <Route path="/manager/board" element={<RoleRoute allowedRoles={['manager']}><TeamBoard /></RoleRoute>} />
          <Route path="/manager/workflows" element={<RoleRoute allowedRoles={['manager']}><ManagerDashboard /></RoleRoute>} />
          <Route path="/manager/tasks" element={<RoleRoute allowedRoles={['manager']}><MyTasks /></RoleRoute>} />
          <Route path="/manager/calendar" element={<RoleRoute allowedRoles={['manager']}><MyTasks defaultView="calendar" /></RoleRoute>} />

          {/* Employee Routes */}
          <Route path="/app" element={<RoleRoute allowedRoles={['employee']}><EmployeeDashboard /></RoleRoute>} />
          <Route path="/app/tasks" element={<RoleRoute allowedRoles={['employee']}><MyTasks /></RoleRoute>} />
          <Route path="/app/calendar" element={<RoleRoute allowedRoles={['employee']}><MyTasks defaultView="calendar" /></RoleRoute>} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
