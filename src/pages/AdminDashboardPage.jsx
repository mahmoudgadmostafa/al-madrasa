import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, BookUser, Settings, GraduationCap, BookCopy, Send, Video, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user, schoolSettings } = useAuth();

  const adminActions = [
    { 
      title: 'إعدادات النظام', 
      icon: <Settings />, 
      path: '/admin/settings', 
      description: 'إدارة اسم المدرسة والمراحل الدراسية والخيارات العامة لتخصيص منصتك', 
      color: 'blue' 
    },
    { 
      title: 'إدارة المعلمين', 
      icon: <BookUser />, 
      path: '/admin/manage-teachers', 
      description: 'إضافة وتعديل بيانات المعلمين والتحكم في حساباتهم وصلاحياتهم', 
      color: 'purple' 
    },
    { 
      title: 'إدارة الطلاب', 
      icon: <GraduationCap />, 
      path: '/admin/manage-students', 
      description: 'إضافة وتسجيل الطلاب الجدد ومتابعة وتعديل بياناتهم الدراسية والمالية', 
      color: 'green' 
    },
    { 
      title: 'إدارة المناهج', 
      icon: <BookCopy />, 
      path: '/admin/curriculum', 
      description: 'تخصيص المواد والمعلمين وتوزيع الفصول الدراسية لكل مرحلة تعليمية', 
      color: 'orange' 
    },
    { 
      title: 'الغرف الافتراضية', 
      icon: <Video />, 
      path: '/admin/online-rooms', 
      description: 'إنشاء وتعديل روابط الحصص المباشرة عبر الإنترنت وتوزيع الغرف', 
      color: 'red' 
    },
    { 
      title: 'إرسال إشعارات', 
      icon: <Send />, 
      path: '/admin/notifications', 
      description: 'إرسال تنبيهات عامة أو خاصة فورية لجميع الطلاب والمعلمين بضغطة زر', 
      color: 'pink' 
    },
  ];

  const getColorStyles = (color) => {
    switch (color) {
      case 'blue':
        return { border: 'hover:border-blue-200', text: 'text-blue-600', bg: 'bg-blue-50 text-blue-600', glow: 'bg-blue-500' };
      case 'purple':
        return { border: 'hover:border-purple-200', text: 'text-purple-600', bg: 'bg-purple-50 text-purple-600', glow: 'bg-purple-500' };
      case 'green':
        return { border: 'hover:border-green-200', text: 'text-green-600', bg: 'bg-green-50 text-green-600', glow: 'bg-green-500' };
      case 'orange':
        return { border: 'hover:border-orange-200', text: 'text-orange-600', bg: 'bg-orange-50 text-orange-600', glow: 'bg-orange-500' };
      case 'red':
        return { border: 'hover:border-red-200', text: 'text-red-600', bg: 'bg-red-50 text-red-600', glow: 'bg-red-500' };
      case 'pink':
        return { border: 'hover:border-pink-200', text: 'text-pink-600', bg: 'bg-pink-50 text-pink-600', glow: 'bg-pink-500' };
      default:
        return { border: 'hover:border-primary/20', text: 'text-primary', bg: 'bg-primary/10 text-primary', glow: 'bg-primary' };
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] relative overflow-hidden">
      {/* شبكة خلفية هندسية */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      
      {/* شبكة إضاءة عصرية (Mesh Gradients) */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/25 to-blue-500/10 blur-[130px] z-0 pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-15%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-500/20 to-pink-500/10 blur-[140px] z-0 pointer-events-none animate-pulse" style={{ animationDuration: '10s' }}></div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {/* الهيدر الترحيبي */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="mb-8 md:mb-10"
        >
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent rounded-2xl p-6 sm:p-8 border border-primary/20 shadow-sm relative overflow-hidden">
            {/* زخرفة خلفية */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/20 rounded-xl text-primary shrink-0">
                    <ShieldAlert size={28} className="sm:w-10 sm:h-10" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
                    إدارة النظام: <span className="text-primary">{schoolSettings?.schoolName || 'منصة المدرسة'}</span>
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base md:text-lg pr-2 sm:pr-16 flex flex-wrap items-center gap-2 mt-2 font-semibold text-gray-600">
                  مرحباً بك، أ. <span className="text-gray-900 font-bold">{user?.name || 'مدير النظام'}</span>
                </p>
              </div>
              <Badge variant="outline" className="bg-white/80 border-primary/30 text-primary font-bold text-xs sm:text-sm px-3.5 py-1.5 self-start md:self-auto shadow-sm">
                لوحة تحكم المدير
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* شبكة الإجراءات */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              opacity: 1,
              transition: {
                when: "beforeChildren",
                staggerChildren: 0.08
              }
            },
            hidden: { opacity: 0 }
          }}
        >
          {adminActions.map((action, index) => {
            const styles = getColorStyles(action.color);
            return (
              <motion.div
                key={index}
                variants={{
                  visible: { opacity: 1, y: 0 },
                  hidden: { opacity: 0, y: 20 }
                }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                className="h-full group"
              >
                <Card 
                  onClick={() => navigate(action.path)} 
                  className={`shadow-md hover:shadow-lg border-gray-100/80 transition-all duration-300 cursor-pointer h-full flex flex-col justify-between overflow-hidden bg-white/70 backdrop-blur-md relative ${styles.border}`}
                >
                  {/* شريط الإضاءة الجانبي */}
                  <div className={`absolute top-0 right-0 w-1.5 h-full ${styles.glow} transform scale-y-0 group-hover:scale-y-100 transition-transform duration-250 origin-top`}></div>
                  
                  <div>
                    <CardHeader className="flex flex-row items-center justify-between pb-3 p-5 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">{action.title}</CardTitle>
                      <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${styles.bg}`}>
                        {React.cloneElement(action.icon, { size: 22 })}
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 sm:px-6 pb-6">
                      <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">{action.description}</p>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;