import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

import { School, LogIn, MessageCircle, Phone, Facebook } from "lucide-react";
import { motion } from "framer-motion";

import { doc, getDoc } from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth as getAuthInstance } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "@/config/firebaseConfig";


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
  const [currentSchoolName, setCurrentSchoolName] = useState('نظام المدارس');
  const navigate = useNavigate();
  const location = useLocation();
  const [index, setIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localAuthChecked, setLocalAuthChecked] = useState(false);
  const redirectAttempted = useRef(false);


// ✅ دالة لجلب النطاق من Firestore مرة واحدة
useEffect(() => {
  const fetchEmailDomain = async () => {
    try {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const docRef = doc(db, "system_config", "school_system_settings");
      const snap = await getDoc(docRef);

      if (snap.exists() && snap.data()?.emailDomain) {
        const domain = snap.data().emailDomain.trim();
        setEmailDomain(domain.startsWith("@") ? domain : `@${domain}`);
        console.log("✅ تم استرداد النطاق:", domain);
      } else {
        console.warn("⚠️ لم يتم العثور على emailDomain في قاعدة البيانات");
      }
    } catch (err) {
      console.error("❌ خطأ أثناء جلب النطاق:", err);
    }
  };

  fetchEmailDomain();
}, []);


  // تحسين: استخدام قيمة افتراضية لاسم المدرسة
  useEffect(() => {
    if (schoolSettings?.schoolName) {
      setCurrentSchoolName(schoolSettings.schoolName);
    }
  }, [schoolSettings]);

  // تحسين: فحص أسرع للمصادقة
  useEffect(() => {
    const timer = setTimeout(() => setLocalAuthChecked(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // توجيه المستخدم بعد تسجيل الدخول
  useEffect(() => {
    if ((authChecked || localAuthChecked) && isAuthenticated && user?.role && !redirectAttempted.current) {
      redirectAttempted.current = true;
      const targetPath =
        user.role === 'admin'
          ? '/admin'
          : user.role === 'teacher'
          ? '/teacher'
          : '/student';

      const from = location.state?.from?.pathname || targetPath;
      console.log('🔄 Auto-redirecting to:', from);
      setTimeout(() => navigate(from, { replace: true }), 50);
    }
  }, [isAuthenticated, user, authChecked, localAuthChecked, navigate, location.state]);

  // تدوير خيارات التواصل
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % contactOptions.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const [emailDomain, setEmailDomain] = useState("@myapp.com");

const handleSubmit = async (e) => {
  e.preventDefault();
  if (loadingAuth || isSubmitting) return;

  setIsSubmitting(true);
  redirectAttempted.current = false;

  try {
    const trimmedIdentifier = identifier.trim().toLowerCase();

    // ✅ توليد البريد بشكل آمن
    let finalEmail = trimmedIdentifier;
    if (!trimmedIdentifier.includes("@")) {
  // ✅ دايمًا أضف "@" يدويًا قبل النطاق
  const cleanDomain = emailDomain.replace(/^@/, ""); // إزالة @ لو كانت موجودة
  finalEmail = `${trimmedIdentifier}@${cleanDomain}`;
}


    // ✅ التحقق من أن البريد بصيغة صحيحة
    if (!finalEmail.includes("@") || finalEmail.endsWith("@")) {
      throw new Error(`invalid email format: ${finalEmail}`);
    }

    console.log("📧 محاولة تسجيل الدخول بالبريد:", finalEmail);

    await login(finalEmail, password);
  } catch (err) {
    console.error("❌ خطأ أثناء تسجيل الدخول:", err);
    redirectAttempted.current = false;
  } finally {
    setIsSubmitting(false);
  }
};

  const isLoading = !authChecked && !localAuthChecked;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4"
          >
            <School className="w-16 h-16 text-primary" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            جاري التحضير...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <motion.div
              className="mx-auto mb-4"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <School className="w-16 h-16 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-foreground">
              مرحباً بك في {currentSchoolName}
            </CardTitle>
            <CardDescription className="text-sm mt-2">
              الرجاء تسجيل الدخول للمتابعة
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  الكود أو البريد الإلكتروني
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="أدخل الكود أو البريد الإلكتروني"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="h-12 text-base"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-colors"
                disabled={loadingAuth || isSubmitting}
              >
                {loadingAuth || isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent"></div>
                    <span>جاري التسجيل...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    <span>تسجيل الدخول</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col items-center text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground font-medium">
              جميع الحقوق محفوظة © 2025
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              تصميم وتطوير بواسطة أ/ محمود جاد مصطفى
            </p>
          </CardFooter>
        </Card>
      </motion.div>

      {/* قسم التواصل */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 w-full max-w-md"
      >
        <p className="text-center text-sm font-medium text-muted-foreground mb-3">
          📢 للتواصل مع إدارة الموقع للحصول على الكود والرقم السري
        </p>

        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-white text-sm py-3 px-4 rounded-lg text-center ${contactOptions[index].color} shadow-md`}
        >
          <a
            href={contactOptions[index].link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center hover:underline transition-all duration-200"
          >
            {contactOptions[index].icon}
            {contactOptions[index].label}
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
