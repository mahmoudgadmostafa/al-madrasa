import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from "@/components/ui/use-toast";
import { UserPlus, Upload } from 'lucide-react';
import { getAuth as getAuthInstance, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getApp } from "firebase/app";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const AddUserModal = ({ isOpen, onClose, onSave, db, defaultRole, educationalStages }) => {
  const [activeTab, setActiveTab] = useState('single');
  const [isLoading, setIsLoading] = useState(false);

  const [userName, setUserName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(defaultRole || 'student');
  const [assignedStageId, setAssignedStageId] = useState('');

  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const validateForm = () => {
    if (!userName.trim() || !loginCode.trim() || !userPassword.trim()) {
      toast({ title: "خطأ في الإدخال", description: "الاسم، كود الدخول، وكلمة المرور مطلوبة.", variant: "destructive" });
      return false;
    }
    if (userPassword.length < 6) {
      toast({ title: "خطأ في الإدخال", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.", variant: "destructive" });
      return false;
    }
    if (role === 'student' && !assignedStageId) {
      toast({ title: "خطأ في الإدخال", description: "يرجى تحديد المرحلة التعليمية للطالب.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveManual = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const fakeEmail = `${loginCode}@myapp.com`;
      const app = getApp('admin-creation-app');
      const auth = getAuthInstance(app);
      const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, userPassword);
      const newUser = userCredential.user;

      const userData = {
        uid: newUser.uid,
        name: userName,
        email: fakeEmail,
        loginCode,
        role,
        phone: phone.trim() || '',
        username: username.trim() || '',
        createdAt: new Date(),
      };

      if (role === 'student') {
        userData.stageId = assignedStageId;
        userData.grade = educationalStages.find(s => s.id === assignedStageId)?.name || 'غير محدد';
      } else if (role === 'teacher') {
        userData.assignedStages = [];
        userData.subjects = [];
      }

      await setDoc(doc(db, "users", newUser.uid), userData);
      onSave({ ...userData, id: newUser.uid }, true);
      toast({ title: "تم الإنشاء بنجاح", description: "تم إنشاء حساب المستخدم الجديد بنجاح." });

      setUserName('');
      setLoginCode('');
      setUserPassword('');
      setUsername('');
      setPhone('');
      setAssignedStageId('');
      onClose();
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "خطأ",
        description: error.code === 'auth/email-already-in-use'
          ? "هذا الكود مستخدم بالفعل."
          : "حدث خطأ أثناء إنشاء المستخدم.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        setImportPreview(rows);
        toast({ title: "تم تحليل الملف", description: `تم استخراج ${rows.length} سجل.` });
      } catch (err) {
        toast({ title: "خطأ في الملف", description: "تأكد من أن الملف بصيغة Excel صحيحة.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async () => {
    if (importPreview.length === 0) {
      toast({ title: "لا توجد بيانات", description: "يرجى رفع ملف Excel أولاً.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    const app = getApp('admin-creation-app');
    const auth = getAuthInstance(app);
    const newUsers = [];

    for (const row of importPreview) {
      try {
        const code = row['الكود'] || row['كود الدخول'] || row['loginCode'] || Math.random().toString(36).substr(2, 6).toUpperCase();
        const email = `${code}@myapp.com`;
        const password = row['كلمة المرور'] || '123456';
        const name = row['الاسم'] || 'طالب جديد';
        const stageName = row['المرحلة التعليمية'] || row['المرحلة'] || '';
        const stageId = educationalStages.find(s => s.name === stageName)?.id || '';

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          uid: user.uid,
          name,
          email,
          loginCode: code,
          role: 'student',
          phone: row['رقم الهاتف'] || '',
          stageId,
          grade: stageName || 'غير محدد',
          createdAt: new Date(),
        };

        await setDoc(doc(db, "users", user.uid), userData);
        newUsers.push({ id: user.uid, ...userData });
      } catch (error) {
        console.error("❌ خطأ أثناء إنشاء حساب:", error);
      }
    }

    setIsImporting(false);
    toast({ title: "تم الاستيراد بنجاح", description: `تم إنشاء ${newUsers.length} حساب.` });
    onSave(newUsers, true);
    setImportPreview([]);
    onClose();
  };

  // 📥 إنشاء وتحميل نموذج Excel يحتوي على ورقتين (نموذج + المراحل)
  const downloadTemplateExcel = () => {
    const headers = [
      ['الاسم', 'الكود', 'كلمة المرور', 'اسم الدخول (اختياري)', 'رقم الهاتف (اختياري)', 'المرحلة التعليمية']
    ];
    const exampleRow = [
      ['أحمد علي', 'S123', '123456', 'ahmadali', '0501234567', 'المرحلة الابتدائية']
    ];
    const wb = XLSX.utils.book_new();
    const wsTemplate = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'نموذج_استيراد');

    // 📘 إنشاء ورقة المراحل التعليمية
    if (educationalStages?.length > 0) {
      const stageData = [['اسم المرحلة التعليمية']];
      educationalStages.forEach(stage => {
        stageData.push([stage.name]);
      });
      const wsStages = XLSX.utils.aoa_to_sheet(stageData);
      XLSX.utils.book_append_sheet(wb, wsStages, 'المراحل التعليمية');
    }

    XLSX.writeFile(wb, 'نموذج_استيراد_الطلاب.xlsx');
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
              <CardTitle>إضافة / استيراد حسابات المستخدمين</CardTitle>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 w-full justify-center">
                  <TabsTrigger value="single">إنشاء يدوي</TabsTrigger>
                  <TabsTrigger value="bulk">استيراد من Excel</TabsTrigger>
                </TabsList>

                {/* 🔹 الإنشاء اليدوي */}
                <TabsContent value="single">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userName">اسم المستخدم</Label>
                      <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="loginCode">كود الدخول</Label>
                      <Input id="loginCode" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="userPassword">كلمة المرور</Label>
                      <Input id="userPassword" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="username">اسم الدخول (اختياري)</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                        <Label htmlFor="assignedStageId">المرحلة التعليمية</Label>
                        <Select value={assignedStageId} onValueChange={setAssignedStageId}>
                          <SelectTrigger id="assignedStageId">
                            <SelectValue placeholder="اختر المرحلة" />
                          </SelectTrigger>
                          <SelectContent>
                            {educationalStages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* 🔹 استيراد من Excel */}
                <TabsContent value="bulk">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="excelFile">رفع ملف Excel</Label>
                      <Input id="excelFile" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
                    </div>

                    {importPreview.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700 mb-2">معاينة أول 5 سجلات:</p>
                        <ul className="text-sm list-disc list-inside text-gray-800">
                          {importPreview.slice(0, 5).map((row, i) => (
                            <li key={i}>{row['الاسم'] || row['name']}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
                      <Button
                        onClick={downloadTemplateExcel}
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 w-full sm:w-auto"
                      >
                        📥 تحميل نموذج Excel
                      </Button>

                      <Button
                        onClick={handleBulkImport}
                        disabled={isImporting || importPreview.length === 0}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      >
                        {isImporting ? "جاري الاستيراد..." : "استيراد الحسابات"}
                        <Upload className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
              {activeTab === 'single' && (
                <>
                  <Button variant="outline" onClick={onClose}>إلغاء</Button>
                  <Button onClick={handleSaveManual} disabled={isLoading}>
                    {isLoading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
                    <UserPlus className="ml-1 h-4 w-4" />
                  </Button>
                </>
              )}
            </CardFooter>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddUserModal;
