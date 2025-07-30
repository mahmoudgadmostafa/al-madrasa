import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { UserPlus } from 'lucide-react';
import { getAuth as getAuthInstance, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getApp } from "firebase/app";

const AddUserModal = ({ isOpen, onClose, onSave, db, defaultRole, educationalStages }) => {
  const [userName, setUserName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [username, setUsername] = useState(''); // اسم الدخول - اختياري
  const [phone, setPhone] = useState('');       // رقم الهاتف - اختياري
  const [role, setRole] = useState(defaultRole || 'student');
  const [assignedStageId, setAssignedStageId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!userName.trim() || !loginCode.trim() || !userPassword.trim()) {
      toast({ title: "خطأ في الإدخال", description: "الاسم، كود الدخول، وكلمة المرور مطلوبون.", variant: "destructive" });
      return false;
    }
    if (userPassword.length < 6) {
      toast({ title: "خطأ في الإدخال", description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل.", variant: "destructive" });
      return false;
    }
    if (role === 'student' && !assignedStageId) {
      toast({ title: "خطأ في الإدخال", description: "يجب تحديد المرحلة التعليمية للطالب.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const fakeEmail = `${loginCode}@myapp.com`;

      const adminCreationApp = getApp('admin-creation-app');
      const tempAuth = getAuthInstance(adminCreationApp);
      const userCredential = await createUserWithEmailAndPassword(tempAuth, fakeEmail, userPassword);
      const newFirebaseUser = userCredential.user;

      let userDataPayload = {
        uid: newFirebaseUser.uid,
        name: userName,
        email: fakeEmail,
        loginCode: loginCode,
        role: role,
      };

      if (username.trim()) {
        userDataPayload.username = username.trim();
      }
      if (phone.trim()) {
        userDataPayload.phone = phone.trim();
      }

      if (role === 'student') {
        userDataPayload.stageId = assignedStageId;
        userDataPayload.grade = educationalStages.find(s => s.id === assignedStageId)?.name || 'غير محدد';
      } else if (role === 'teacher') {
        userDataPayload.assignedStages = [];
        userDataPayload.subjects = [];
      }

      await setDoc(doc(db, "users", newFirebaseUser.uid), userDataPayload);

      onSave({ ...userDataPayload, id: newFirebaseUser.uid }, true);

      toast({ title: "نجاح!", description: `تم إنشاء حساب المستخدم بنجاح.` });

      setUserName('');
      setLoginCode('');
      setUserPassword('');
      setUsername('');
      setPhone('');
      setAssignedStageId('');
      onClose();

    } catch (error) {
      console.error("Error creating user:", error);
      let errorMessage = "فشل إنشاء المستخدم.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "هذا الكود مستخدم بالفعل.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "الكود غير صالح.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "كلمة المرور ضعيفة جدًا.";
      }
      toast({ title: "خطأ", description: `${errorMessage} (${error.message})`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>إنشاء حساب مستخدم جديد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userName">اسم المستخدم</Label>
                <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="loginCode">الكود</Label>
                <Input id="loginCode" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="userPassword">كلمة المرور</Label>
                <Input id="userPassword" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="username">اسم الدخول (اختياري)</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder=" " />
              </div>
              <div>
                <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder=" " />
              </div>
              <div>
                <Label htmlFor="userRole">الدور</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="userRole">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">طالب</SelectItem>
                    <SelectItem value="teacher">معلم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'student' && (
                <div>
                  <Label htmlFor="assignedStageId">المرحلة التعليمية للطالب</Label>
                  <Select value={assignedStageId || ''} onValueChange={setAssignedStageId}>
                    <SelectTrigger id="assignedStageId">
                      <SelectValue placeholder="اختر المرحلة" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationalStages?.length > 0 ? (
                        educationalStages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder-no-stages" disabled>لا توجد مراحل معرفة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
                <UserPlus className="mr-1 ml-0 rtl:ml-1 rtl:mr-0 h-4 w-4" />
              </Button>
            </CardFooter>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddUserModal;
