import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signOut, updatePassword, updateEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState({ schoolName: '', educationalStages: [], academicYear: '' });
  const [authChecked, setAuthChecked] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  // حفظ الحالة في localStorage
  const saveAuthState = (userData, authenticated) => {
    try {
      if (userData && authenticated) {
        localStorage.setItem('authState', JSON.stringify({
          user: userData,
          isAuthenticated: authenticated,
          timestamp: Date.now()
        }));
      } else {
        localStorage.removeItem('authState');
      }
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  };

  // استعادة الحالة من localStorage
  const getStoredAuthState = () => {
    try {
      const stored = localStorage.getItem('authState');
      if (stored) {
        const { user, isAuthenticated, timestamp } = JSON.parse(stored);
        
        // التحقق من أن البيانات ليست قديمة (أكثر من 24 ساعة)
        const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
        
        if (!isExpired) {
          return { user, isAuthenticated };
        } else {
          localStorage.removeItem('authState');
        }
      }
    } catch (error) {
      console.error('Error reading stored auth state:', error);
    }
    return null;
  };

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

  // التحقق من وجود مستخدم مسجل مسبقاً عند تحميل التطبيق
  useEffect(() => {
    const initializeAuth = async () => {
      setLoadingAuth(true);
      try {
        // أولاً: حاول استعادة الحالة من localStorage
        const storedAuth = getStoredAuthState();
        if (storedAuth) {
          console.log('🔄 Restoring auth state from localStorage');
          setUser(storedAuth.user);
          setIsAuthenticated(storedAuth.isAuthenticated);
        }

        // ثانياً: تحقق من Firebase Auth
        const currentUser = auth.currentUser;
        console.log('🔍 Checking Firebase auth, currentUser:', currentUser?.uid);
        
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log('📋 User data found:', userData.role);
            
            if (userData.role) {
              const userInfo = { uid: currentUser.uid, email: currentUser.email, ...userData };
              setUser(userInfo);
              setIsAuthenticated(true);
              saveAuthState(userInfo, true); // حفظ الحالة
              console.log('✅ User authenticated successfully');
            } else {
              console.log('❌ No role found, logging out');
              await signOut(auth);
              setUser(null);
              setIsAuthenticated(false);
              saveAuthState(null, false); // مسح الحالة
            }
          } else {
            console.log('❌ No user data in Firestore, logging out');
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
            saveAuthState(null, false); // مسح الحالة
          }
        } else {
          console.log('🔒 No current user found in Firebase');
          // إذا لم يكن هناك مستخدم في Firebase، تأكد من مسح localStorage
          if (!storedAuth) {
            setUser(null);
            setIsAuthenticated(false);
            saveAuthState(null, false);
          }
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        await signOut(auth);
        setUser(null);
        setIsAuthenticated(false);
        saveAuthState(null, false); // مسح الحالة في حالة الخطأ
      } finally {
        setLoadingAuth(false);
        setAuthChecked(true);
        console.log('🏁 Auth initialization completed');
      }
    };

    initializeAuth();
  }, [auth, db]);

  const login = async (email, password) => {
    setLoadingAuth(true);
    console.log('🚀 Starting login process for:', email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase auth successful, UID:', userCredential.user.uid);
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('📋 User document found, role:', userData.role);
        
        if (userData.role) {
          // تحديث state بالمستخدم الجديد
          const userInfo = { uid: userCredential.user.uid, email: userCredential.user.email, ...userData };
          setUser(userInfo);
          setIsAuthenticated(true);
          saveAuthState(userInfo, true); // حفظ الحالة بعد تسجيل الدخول
          
          console.log('🎉 Login successful, user set in state');
          toast({ title: "تم تسجيل الدخول بنجاح!", description: `مرحباً بك مجدداً.` });
          return { success: true, user: userInfo };
        } else {
          console.log('❌ No role in user data');
          await signOut(auth);
          throw new Error("User role not found");
        }
      } else {
        console.log('❌ No user document in Firestore');
        await signOut(auth);
        throw new Error("User data not found in database.");
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      
      let errorMessage = "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }
      
      // إعادة تعيين الحالة في حالة الخطأ
      setUser(null);
      setIsAuthenticated(false);
      saveAuthState(null, false); // مسح الحالة
      
      toast({ title: "فشل تسجيل الدخول", description: errorMessage, variant: "destructive" });
      throw error;
    } finally {
      setLoadingAuth(false);
      console.log('🏁 Login process finished');
    }
  };

  const logout = async () => {
    setLoadingAuth(true);
    console.log('🚪 Starting logout process');
    
    try {
      await signOut(auth);
      // إعادة تعيين الحالة محلياً
      setUser(null);
      setIsAuthenticated(false);
      saveAuthState(null, false); // مسح الحالة بعد تسجيل الخروج
      
      console.log('✅ Logout successful');
      toast({ title: "تم تسجيل الخروج", description: "نأمل رؤيتك قريباً!" });
    } catch (error) {
      console.error("❌ Logout error:", error);
      toast({ title: "خطأ", description: "فشل تسجيل الخروج", variant: "destructive" });
    } finally {
      setLoadingAuth(false);
    }
  };

  // باقي الدوال...
  const updateSchoolSettings = (newSettings) => {
    setSchoolSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  };

  const updateUserProfile = async (newData) => {
    if (!user) return;
    setLoadingAuth(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, newData, { merge: true });
      const updatedUser = { ...user, ...newData };
      setUser(updatedUser);
      saveAuthState(updatedUser, true); // تحديث الحالة المحفوظة
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
      const updatedUser = { ...user, email: newEmail };
      setUser(updatedUser);
      saveAuthState(updatedUser, true); // تحديث الحالة المحفوظة
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
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loadingAuth, 
      authChecked,
      login, 
      logout, 
      schoolSettings, 
      updateSchoolSettings, 
      auth, 
      updateUserProfile, 
      updateUserEmailInAuth, 
      updateUserPasswordInAuth 
    }}>
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