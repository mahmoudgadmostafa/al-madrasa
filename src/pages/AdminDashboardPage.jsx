import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BookUser, Settings, GraduationCap, BookCopy, Send, Video } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user, schoolSettings } = useAuth();

  const adminActions = [
    { title: 'إعدادات النظام', icon: <Settings />, path: '/admin/settings', description: 'إدارة اسم المدرسة والمراحل الدراسية' },
    { title: 'إدارة المعلمين', icon: <BookUser />, path: '/admin/manage-teachers', description: 'إضافة وتعديل بيانات المعلمين' },
    { title: 'إدارة الطلاب', icon: <GraduationCap />, path: '/admin/manage-students', description: 'إضافة وتعديل بيانات الطلاب' },
    { title: 'إدارة المناهج', icon: <BookCopy />, path: '/admin/curriculum', description: 'تحديد المواد والمعلمين لكل مرحلة' },
    { title: 'الغرف الافتراضية', icon: <Video />, path: '/admin/online-rooms', description: 'إدارة روابط الحصص الأونلاين' },
    { title: 'إرسال إشعارات', icon: <Send />, path: '/admin/notifications', description: 'إرسال تنبيهات للمعلمين والطلاب' },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          لوحة تحكم المدير - {schoolSettings?.schoolName || ' '}
        </h1>
        <p className="text-muted-foreground mb-8">
          مرحباً بك، {user?.name || 'مدير النظام'}.
        </p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            opacity: 1,
            transition: {
              when: "beforeChildren",
              staggerChildren: 0.1
            }
          },
          hidden: { opacity: 0 }
        }}
      >
        {adminActions.map((action, index) => (
          <motion.div
            key={index}
            variants={{
              visible: { opacity: 1, y: 0 },
              hidden: { opacity: 0, y: 20 }
            }}
            whileHover={{ y: -5, scale: 1.03 }}
            className="h-full"
          >
            <Card 
              onClick={() => navigate(action.path)} 
              className="shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer h-full flex flex-col"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">{action.title}</CardTitle>
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  {React.cloneElement(action.icon, { size: 24 })}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default AdminDashboardPage;