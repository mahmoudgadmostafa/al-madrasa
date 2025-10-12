import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, updateEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState({ schoolName: '', educationalStages: [], academicYear: '' });
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const settingsRef = doc(db, "system_config", "school_system_settings");
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchoolSettings({
          schoolName: data.schoolName || ' ',
          educationalStages: data.educationalStages || [],
          academicYear: data.academicYear || ''
        });
      }
    });
    return () => unsubscribeSettings();
  }, [db]);

  useEffect(() => {
   const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
  if (!firebaseUser) {
    // المستخدم خرج من النظام
    setUser(null);
    setIsAuthenticated(false);
    setLoadingAuth(false);
    return;
  }

  setLoadingAuth(true);
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.role) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userData });
        setIsAuthenticated(true);
      } else {
        signOut(auth);
      }
    } else {
      signOut(auth);
    }
    setLoadingAuth(false);
  });
  return () => unsubscribeUser();
});

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setLoadingAuth(false);
      }
    });
    return () => unsubscribeAuth();
  }, [auth, db]);

  const login = async (email, password) => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
          toast({ title: "تم تسجيل الدخول بنجاح!", description: `مرحباً بك مجدداً.` });
          const userData = userDocSnap.data();
          const targetPath = userData.role === 'admin' ? '/admin' : userData.role === 'teacher' ? '/teacher' : '/student';
          navigate(targetPath);
      } else {
         throw new Error("User data not found in database.");
      }
    } catch (error) {
      let errorMessage = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }
      toast({ title: "فشل تسجيل الدخول", description: errorMessage, variant: "destructive" });
      setLoadingAuth(false);
    }
  };

 const logout = async () => {
  try {
    setLoadingAuth(true); // ✅ لعرض اللودر أثناء الخروج
    await signOut(auth);
    
    // ✅ تنظيف الحالة يدويًا
    setUser(null);
    setIsAuthenticated(false);

    // ✅ نضيف تأخير بسيط للسماح لـ onAuthStateChanged بالاستقرار
    setTimeout(() => {
      navigate('/login');
    }, 100);

    toast({
      title: "تم تسجيل الخروج",
      description: "نأمل رؤيتك قريباً!",
    });
  } catch (error) {
    toast({
      title: "خطأ في تسجيل الخروج",
      description: "حدثت مشكلة أثناء تسجيل الخروج. حاول مرة أخرى.",
      variant: "destructive",
    });
  } finally {
    setLoadingAuth(false);
  }
};

  
  const updateSchoolSettings = (newSettings) => {
    setSchoolSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  };

  const updateUserProfile = async (newData) => {
    if (!user) return;
    setLoadingAuth(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, newData, { merge: true });
      setUser(prevUser => ({ ...prevUser, ...newData }));
      toast({ title: "نجاح", description: "تم تحديث اسمك بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الاسم.", variant: "destructive" });
    } finally {
      setLoadingAuth(false);
    }
  };
  
  const updateUserEmailInAuth = async (newEmail) => {
    if (!auth.currentUser || newEmail === auth.currentUser.email) return;
    setLoadingAuth(true);
    try {
      await updateEmail(auth.currentUser, newEmail);
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { email: newEmail }, { merge: true });
      toast({ title: "نجاح", description: "تم تحديث البريد الإلكتروني بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: error.code === 'auth/requires-recent-login' ? "هذه العملية حساسة وتتطلب إعادة تسجيل الدخول. الرجاء تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجدداً." : "فشل تحديث البريد الإلكتروني.", variant: "destructive" });
    } finally {
      setLoadingAuth(false);
    }
  };

  const updateUserPasswordInAuth = async (newPassword) => {
    if (!auth.currentUser) return;
    setLoadingAuth(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast({ title: "نجاح", description: "تم تحديث كلمة المرور بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: error.code === 'auth/requires-recent-login' ? "هذه العملية حساسة وتتطلب إعادة تسجيل الدخول. الرجاء تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجدداً." : "فشل تحديث كلمة المرور.", variant: "destructive" });
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loadingAuth, login, logout, schoolSettings, updateSchoolSettings, auth, updateUserProfile, updateUserEmailInAuth, updateUserPasswordInAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
