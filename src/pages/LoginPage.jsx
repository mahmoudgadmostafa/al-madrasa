import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { School, LogIn, MessageCircle, Phone, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';

const contactOptions = [
  {
    label: 'راسلنا على واتساب',
    link: 'https://wa.me/201060607654',
    color: 'bg-green-600',
    icon: <MessageCircle className="w-4 h-4 mr-2 text-white" />,
  },
  {
    label: 'اتصل بنا: 01060607654',
    link: 'tel:01060607654',
    color: 'bg-blue-600',
    icon: <Phone className="w-4 h-4 mr-2 text-white" />,
  },
  {
    label: 'صفحتنا على فيسبوك',
    link: 'https://web.facebook.com/maharet.edu',
    color: 'bg-primary',
    icon: <Facebook className="w-4 h-4 mr-2 text-white" />,
  },
];

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login, loadingAuth, schoolSettings, isAuthenticated, user, authChecked } = useAuth();
  const [currentSchoolName, setCurrentSchoolName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [index, setIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    console.log('📍 LoginPage State:', { 
      isAuthenticated, 
      userRole: user?.role, 
      authChecked, 
      redirectAttempted: redirectAttempted.current 
    });
  });

  useEffect(() => {
    if (schoolSettings?.schoolName) {
      setCurrentSchoolName(schoolSettings.schoolName);
    }
  }, [schoolSettings]);

  // التوجيه التلقائي عندما يكون المستخدم مسجلاً
  useEffect(() => {
    if (authChecked && isAuthenticated && user?.role && !redirectAttempted.current) {
      redirectAttempted.current = true;
      
      const targetPath = user.role === 'admin' ? '/admin' : 
                        user.role === 'teacher' ? '/teacher' : 
                        '/student';
      
      const from = location.state?.from?.pathname || targetPath;
      
      console.log('🔄 Auto-redirecting to:', from, 'Role:', user.role);
      
      // تأخير بسيط لضمان استقرار التطبيق
      setTimeout(() => {
        console.log('🚀 Navigating now to:', from);
        navigate(from, { replace: true });
      }, 100);
    }
  }, [isAuthenticated, user, authChecked, navigate, location.state]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % contactOptions.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loadingAuth || isSubmitting) return;
    
    setIsSubmitting(true);
    redirectAttempted.current = false; // إعادة تعيين قبل محاولة جديدة
    console.log('🎯 Form submitted, reset redirectAttempted');
    
    try {
      const trimmedIdentifier = identifier.trim().toLowerCase();
      const finalEmail = trimmedIdentifier.includes('@') 
        ? trimmedIdentifier 
        : `${trimmedIdentifier}@myapp.com`;

      console.log('🔐 Attempting login with:', finalEmail);
      const result = await login(finalEmail, password);
      
      if (result.success) {
        console.log('✅ Login successful in handleSubmit, waiting for redirect...');
        // التوجيه سيحدث تلقائياً عبر useEffect أعلاه
      }
    } catch (err) {
      console.error('❌ Login error in handleSubmit:', err);
      redirectAttempted.current = false; // إعادة تعيين في حالة الخطأ
    } finally {
      setIsSubmitting(false);
    }
  };

  // شاشة تحميل أثناء التحقق الأولي من المصادقة
  if (!authChecked) {
    console.log('⏳ Showing loading screen - auth not checked yet');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحضير...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering login form');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <motion.div className="mx-auto mb-4" animate={{ rotateY: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <School className="w-16 h-16 text-primary" />
            </motion.div>
            <CardTitle className="text-3xl font-bold">مرحباً بك في نظام {currentSchoolName}</CardTitle>
            <CardDescription>الرجاء تسجيل الدخول للمتابعة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="identifier"> الكود أو البريد</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="الكود أو البريد"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="ادخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-lg"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full text-lg py-3 bg-primary hover:bg-primary/90" 
                disabled={loadingAuth || isSubmitting}
              >
                {loadingAuth || isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground"></div>
                ) : (
                  <>
                    <LogIn className="mr-2 ml-0 h-5 w-5" />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground mt-2 space-y-1">
            <p className="font-semibold text-xs text-muted-foreground">جميع الحقوق محفوظة © 2025</p>
            <p className="font-semibold text-xs text-muted-foreground">تصميم وتطوير بواسطة أ/ محمود جاد مصطفى</p>
          </CardFooter>
        </Card>
      </motion.div>

      <div className="mt-10">
        <p className="text-center text-sm font-semibold text-muted-foreground mb-2">
          📢  للتواصل مع إدارة الموقع للحصول علي الكود والرقم السري
        </p>
        <div className="w-full max-w-md">
          <div className={`text-white text-sm py-2 px-4 rounded-md text-center ${contactOptions[index].color}`}>
            <a
              href={contactOptions[index].link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center hover:underline"
            >
              {contactOptions[index].icon}
              {contactOptions[index].label}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
