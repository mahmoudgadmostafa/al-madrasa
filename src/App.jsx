import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

import LoginPage from '@/pages/LoginPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import TeacherDashboardPage from '@/pages/TeacherDashboardPage';
import StudentDashboardPage from '@/pages/StudentDashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import Navbar from '@/components/Navbar';
import SystemSettingsPage from '@/pages/SystemSettingsPage';
import ManageTeachersPage from '@/pages/ManageTeachersPage';
import ManageStudentsPage from '@/pages/ManageStudentsPage';
import ManageSubjectsPage from '@/pages/ManageSubjectsPage';
import ManageCurriculumPage from '@/pages/ManageCurriculumPage';
import SendNotificationsPage from '@/pages/SendNotificationsPage';
import ManageOnlineRoomsPage from '@/pages/ManageOnlineRoomsPage';
import ChatPage from '@/pages/ChatPage';
import ProfilePage from '@/pages/ProfilePage';
import { School } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, loadingAuth, authChecked } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute Check:', {
    path: location.pathname,
    allowedRoles,
    userRole: user?.role,
    isAuthenticated,
    loadingAuth,
    authChecked
  });

  if (loadingAuth || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // إذا لم يتم تحميل role بعد، انتظر
  if (!user?.role) {
    console.log('⏳ User role not loaded yet, waiting...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
        <p className="ml-4 text-lg text-foreground">جاري تحميل الصلاحيات...</p>
      </div>
    );
  }

  // تحقق من الصلاحيات فقط بعد التأكد من وجود role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log('🚫 Role mismatch:', {
      userRole: user.role,
      allowedRoles,
      path: location.pathname
    });
    
    // بدلاً من /unauthorized، وجه إلى Dashboard المناسب
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'teacher') {
      return <Navigate to="/teacher" replace />;
    } else if (user.role === 'student') {
      return <Navigate to="/student" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  console.log('✅ Access granted for role:', user.role);
  return <Outlet />;
};

const PageLayout = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

const App = () => {
  const { isAuthenticated, user, loadingAuth, schoolSettings, authChecked } = useAuth();
  const location = useLocation();
  const logoUrl = "/logo.png";

  // تحسين شاشة التحميل
  if ((loadingAuth || !authChecked) && location.pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{schoolSettings?.schoolName || ' '}</title>
        <link rel="icon" type="image/png" href={logoUrl} />
      </Helmet>

      <div className="flex flex-col min-h-screen bg-background">
        {isAuthenticated && user && <Navbar />}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<PageLayout><LoginPage /></PageLayout>} />

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<PageLayout><AdminDashboardPage /></PageLayout>} />
              <Route path="/admin/settings" element={<PageLayout><SystemSettingsPage /></PageLayout>} />
              <Route path="/admin/manage-teachers" element={<PageLayout><ManageTeachersPage /></PageLayout>} />
              <Route path="/admin/manage-students" element={<PageLayout><ManageStudentsPage /></PageLayout>} />
              <Route path="/admin/manage-subjects" element={<PageLayout><ManageSubjectsPage /></PageLayout>} />
              <Route path="/admin/curriculum" element={<PageLayout><ManageCurriculumPage /></PageLayout>} />
              <Route path="/admin/notifications" element={<PageLayout><SendNotificationsPage /></PageLayout>} />
              <Route path="/admin/online-rooms" element={<PageLayout><ManageOnlineRoomsPage /></PageLayout>} />
              <Route path="/admin/profile" element={<PageLayout><ProfilePage /></PageLayout>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<PageLayout><TeacherDashboardPage /></PageLayout>} />
              <Route path="/teacher/profile" element={<PageLayout><ProfilePage /></PageLayout>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<PageLayout><StudentDashboardPage /></PageLayout>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'student']} />}>
              <Route path="/chat" element={<PageLayout><ChatPage /></PageLayout>} />
              <Route path="/chat/:chatId" element={<PageLayout><ChatPage /></PageLayout>} />
            </Route>

            <Route path="/" element={
              (loadingAuth || !authChecked) ? (
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                  <p className="ml-4 text-lg text-foreground">جاري التحميل...</p>
                </div>
              ) : (
                isAuthenticated && user ? (
                  user.role === 'admin' ? <Navigate to="/admin" /> :
                  user.role === 'teacher' ? <Navigate to="/teacher" /> :
                  user.role === 'student' ? <Navigate to="/student" /> :
                  <Navigate to="/login" />
                ) : (
                  <Navigate to="/login" />
                )
              )
            } />

            {/* يمكنك إزالة صفحة /unauthorized أو تعديلها */}
            <Route path="/unauthorized" element={
              <PageLayout>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                  <School size={64} className="text-destructive mb-4" />
                  <h1 className="text-3xl font-bold text-destructive mb-2">غير مصرح لك بالدخول</h1>
                  <p className="text-muted-foreground mb-4">ليس لديك الأذونات اللازمة لعرض هذه الصفحة.</p>
                  {user && (
                    <p className="text-sm text-muted-foreground">
                      أنت مسجل كـ: {user.role}
                    </p>
                  )}
                </div>
              </PageLayout>
            } />

            <Route path="*" element={<PageLayout><NotFoundPage /></PageLayout>} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  );
};

export default App;