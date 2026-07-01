import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import {
  Users, Edit, Trash2, Save, ArrowLeft, Book, BookOpen, BookX,
  Settings, Phone, Key, User, Mail, UserPlus, Download
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import {
  getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc
} from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import AddUserModal from '@/components/admin/AddUserModal';
import * as XLSX from "xlsx";

// Checkbox بسيط
const Checkbox = ({ checked, onCheckedChange, id, disabled = false }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
  />
);

const ManageStudentsPage = () => {
  // حالات الأساسية
  const [students, setStudents] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // حالات النوافذ المنبثقة
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  // بيانات نموذج التعديل
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [assignedStageId, setAssignedStageId] = useState('');

  // مواد
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const db = getFirestore();
  const navigate = useNavigate();

  // callback عند حفظ مستخدم واحد أو مصفوفة مستخدمين
  const handleUserSaved = useCallback((savedUser, isNew) => {
    if (Array.isArray(savedUser)) {
      setStudents(prev => [...prev, ...savedUser]);
      toast({ title: "تم الاستيراد", description: `تم إضافة ${savedUser.length} طالب.` });
    } else if (isNew) {
      setStudents(prev => [...prev, savedUser]);
      toast({ title: "تم الإنشاء", description: "تم إنشاء حساب الطالب بنجاح." });
    } else {
      setStudents(prev => prev.map(s => (s.id === savedUser.id ? savedUser : s)));
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الطالب." });
    }
  }, []);

  

const [exportStage, setExportStage] = useState("all");

const handleExportToExcel = () => {
  if (!students || students.length === 0) {
    toast({ title: "لا توجد بيانات", description: "قائمة الطلاب فارغة.", variant: "destructive" });
    return;
  }

  const wb = XLSX.utils.book_new();

  // 🧩 دالة صغيرة لتحويل الطلاب إلى جدول Excel
  const createSheetData = (data) =>
    data.map((s) => ({
      الاسم: s.name || "",
      الكود: s.loginCode || "",
      البريد_الإلكتروني: s.email || "",
      رقم_الهاتف: s.phone || "",
      المرحلة: s.grade || "",
      الدور: s.role || "",
    }));

  // 🔹 لو تم اختيار مرحلة معينة
  if (exportStage !== "all") {
    const stage = educationalStages.find((st) => st.id === exportStage);
    const stageName = stage?.name || "مرحلة غير معروفة";
    const filtered = students.filter((s) => s.stageId === exportStage);

    if (filtered.length === 0) {
      toast({
        title: "لا يوجد طلاب للتصدير",
        description: `لا توجد سجلات في ${stageName}.`,
        variant: "destructive",
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(createSheetData(filtered));
    XLSX.utils.book_append_sheet(wb, ws, stageName);

    XLSX.writeFile(wb, `تصدير_${stageName}.xlsx`);
    toast({ title: "تم التصدير", description: `تم تصدير ${filtered.length} طالبًا.` });
    return;
  }

  // 🔸 في حالة اختيار "الكل" => إنشاء Sheet لكل مرحلة
  educationalStages.forEach((stage) => {
    const filtered = students.filter((s) => s.stageId === stage.id);
    const ws = XLSX.utils.json_to_sheet(createSheetData(filtered));
    XLSX.utils.book_append_sheet(wb, ws, stage.name);
  });

  // ✅ إضافة ورقة شاملة "جميع الطلاب"
  const wsAll = XLSX.utils.json_to_sheet(createSheetData(students));
  XLSX.utils.book_append_sheet(wb, wsAll, "جميع الطلاب");

  XLSX.writeFile(wb, "تقرير_الطلاب.xlsx");
  toast({ title: "تم التصدير بنجاح", description: "تم إنشاء ملف Excel متعدد الأوراق." });
};
     

  // جلب المواد لمرحلة محددة من مجموعة curriculum
  const fetchSubjectsForStage = useCallback(async (stageId) => {
    if (!stageId) return [];
    setIsLoadingSubjects(true);
    try {
      const curriculumRef = doc(db, "curriculum", stageId);
      const curriculumDoc = await getDoc(curriculumRef);
      if (!curriculumDoc.exists()) return [];
      const data = curriculumDoc.data();
      const allSubjects = [];

      if (Array.isArray(data.semesterOneSubjects)) {
        data.semesterOneSubjects.forEach(subject => {
          if (subject && (subject.id || subject._id)) {
            const id = subject.id || subject._id;
            const name = subject.title || subject.name || subject.subjectName || `مادة ${id}`;
            allSubjects.push({ id, name, semester: 'الفصل الأول' });
          }
        });
      }

      if (Array.isArray(data.semesterTwoSubjects)) {
        data.semesterTwoSubjects.forEach(subject => {
          if (subject && (subject.id || subject._id)) {
            const id = subject.id || subject._id;
            const name = subject.title || subject.name || subject.subjectName || `مادة ${id}`;
            allSubjects.push({ id, name, semester: 'الفصل الثاني' });
          }
        });
      }

      return allSubjects;
    } catch (error) {
      console.error("❌ خطأ في جلب المواد:", error);
      return [];
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [db]);

  // جلب البيانات الابتدائية (طلاب + مراحل)
  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = studentsSnapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          uid: d.uid || docSnap.id,
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          loginCode: d.loginCode || '',
          password: d.password || '',
          stageId: d.stageId || '',
          grade: d.grade || '',
          role: d.role || 'student',
          activeSubjects: Array.isArray(d.activeSubjects) ? d.activeSubjects : [],
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null
        };
      });
      setStudents(fetchedStudents);

      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        const stages = Array.isArray(settingsData.educationalStages) ? settingsData.educationalStages : [];
        setEducationalStages(stages);
      } else {
        setEducationalStages([]);
      }
    } catch (error) {
      console.error("❌ خطأ في التحميل:", error);
      toast({ title: "خطأ", description: "تعذر تحميل البيانات.", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  }, [db]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // فتح نافذة التعديل
  const openEditModal = (student) => {
    if (!student) return;
    setCurrentStudent(student);
    setStudentName(student.name || '');
    setStudentEmail(student.email || '');
    setStudentPhone(student.phone || '');
    setLoginCode(student.loginCode || '');
    setStudentPassword('');
    setAssignedStageId(student.stageId || '');
    setIsEditModalOpen(true);
  };

  // فتح نافذة المواد
  const openSubjectsModal = async (student) => {
    if (!student) return;
    setCurrentStudent(student);
    setSelectedSubjects(Array.isArray(student.activeSubjects) ? student.activeSubjects : []);
    setIsLoadingSubjects(true);

    if (student.stageId) {
      const subjects = await fetchSubjectsForStage(student.stageId);
      setAvailableSubjects(subjects);
    } else {
      setAvailableSubjects([]);
      toast({ title: "تنبيه", description: "الطالب ليس مسجلاً في أي مرحلة.", variant: "destructive" });
    }

    setIsLoadingSubjects(false);
    setIsSubjectsModalOpen(true);
  };

  // تحديث بيانات الطالب (يدعم id أو uid)
  const handleUpdateStudent = async () => {
    if (!currentStudent || !studentName.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم الطالب.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const studentDocId = currentStudent.id || currentStudent.uid;
      if (!studentDocId) throw new Error("لم يتم العثور على معرف الطالب.");

      const studentData = {
      name: studentName.trim(),
      email: studentEmail.trim(),
      phone: studentPhone.trim(),
      loginCode: String(loginCode || "").trim(), // ✅ التحويل إلى نص قبل trim()
      stageId: assignedStageId || '',
      grade: educationalStages.find(s => s.id === assignedStageId)?.name || '',
      updatedAt: new Date()
      };

      if (studentPassword && studentPassword.trim()) studentData.password = studentPassword.trim();

      const studentRef = doc(db, "users", studentDocId);
      await updateDoc(studentRef, studentData);

      setStudents(prev => prev.map(s =>
        (s.id === studentDocId || s.uid === studentDocId) ? { ...s, ...studentData } : s
      ));

      const stageName = educationalStages.find(s => s.id === assignedStageId)?.name || '';
      toast({
        title: "تم الحفظ",
        description: stageName ? `تم نقل الطالب إلى مرحلة ${stageName}` : "تم تحديث بيانات الطالب."
      });

      setIsEditModalOpen(false);
    } catch (error) {
      console.error("❌ خطأ أثناء التحديث:", error);
      toast({ title: "خطأ", description: "تعذر حفظ التغييرات. تحقق من صلاحيات الكتابة أو الاتصال.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث المواد للطالب
  const handleUpdateSubjects = async () => {
    if (!currentStudent) return;
    setIsLoading(true);
    try {
      const studentDocId = currentStudent.id || currentStudent.uid;
      if (!studentDocId) throw new Error("لم يتم العثور على معرف الطالب.");

      const studentRef = doc(db, "users", studentDocId);
      await updateDoc(studentRef, {
        activeSubjects: selectedSubjects,
        updatedAt: new Date()
      });

      setStudents(prev => prev.map(s =>
        (s.id === studentDocId || s.uid === studentDocId) ? { ...s, activeSubjects: selectedSubjects } : s
      ));

      toast({ title: "تم الحفظ", description: "تم تحديث المواد للطالب." });
      setIsSubjectsModalOpen(false);
    } catch (error) {
      console.error("❌ خطأ في تحديث المواد:", error);
      toast({ title: "خطأ", description: "تعذر تحديث المواد.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // حذف طالب
  const handleDeleteStudent = async (studentId) => {
    if (!studentId) return;
    const confirmed = window.confirm("هل أنت متأكد أنك تريد حذف هذا الطالب؟");
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast({ title: "تم الحذف", description: "تم حذف الطالب بنجاح." });
    } catch (error) {
      console.error("❌ خطأ في الحذف:", error);
      toast({ title: "خطأ", description: "تعذر حذف الطالب.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // تجميع الطلاب حسب المرحلة
  const studentsByStage = educationalStages.map(stage => ({
    ...stage,
    students: students.filter(s => s.stageId === stage.id)
  }));
  const unassignedStudents = students.filter(s => !s.stageId || !educationalStages.some(e => e.id === s.stageId));

  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
        <p className="mt-3 text-gray-600">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* هيدر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
            <p className="text-gray-600">({students.length}) طالب مسجل</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="ml-2 h-4 w-4" /> العودة
        </Button>
      </div>
      {/* 🔹 واجهة اختيار المرحلة للتصدير */}
<div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
  <Select value={exportStage} onValueChange={setExportStage}>
    <SelectTrigger className="w-full sm:w-64">
      <SelectValue placeholder="اختر المرحلة للتصدير" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">كل المراحل (في ملف واحد)</SelectItem>
      {educationalStages.map((stage) => (
        <SelectItem key={stage.id} value={stage.id}>
          {stage.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <Button
    onClick={handleExportToExcel}
    className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
  >
    تصدير Excel
  </Button>
</div>


      {/* بطاقات الإجراءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-lg">
          <h3 className="font-semibold mb-2">إضافة / استيراد طلاب</h3>
          <p className="text-sm text-gray-600 mb-3">إنشاء حساب جديد أو استيراد دفعة طلاب من ملف Excel</p>
          <Button onClick={() => setIsAddUserModalOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700">
            <UserPlus className="ml-2 h-4 w-4" /> إضافة / استيراد
          </Button>
        </div>

        <div className="bg-white border p-5 rounded-lg">
          <h3 className="font-semibold mb-2">تصدير إلى Excel</h3>
          <Button onClick={handleExportToExcel} className="w-full bg-purple-600 hover:bg-purple-700">
            <Download className="ml-2 h-4 w-4" /> تصدير البيانات
          </Button>
        </div>

        <div className="bg-white border p-5 rounded-lg">
          <h3 className="font-semibold mb-2">المواد والتقارير</h3>
          <p className="text-sm text-gray-600 mb-3">يمكن تعديل المواد لكل طالب من زر "المواد" بجانب كل صف.</p>
          <Button variant="outline" onClick={() => toast({ title: "معلومة", description: "اضغط 'المواد' بجانب اسم الطالب لفتح نافذة تعديل المواد." })} className="w-full">
            كيف أعدل المواد؟
          </Button>
        </div>
      </div>

      {/* AddUserModal الموحد */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={handleUserSaved}
        db={db}
        defaultRole="student"
        educationalStages={educationalStages}
      />

      {/* قوائم الطلاب حسب المراحل */}
      <div className="space-y-6">
        {studentsByStage.map(stage => (
          <div key={stage.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-blue-50 p-3 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen className="text-blue-600" />
                <h3 className="font-semibold">{stage.name}</h3>
              </div>
              <span className="text-sm text-gray-700">{stage.students.length} طالب</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">الاسم</th>
                    <th className="p-2">البريد</th>
                    <th className="p-2">الهاتف</th>
                    <th className="p-2">الكود</th>
                    <th className="p-2">مواد</th>
                    <th className="p-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {stage.students.map(student => (
                    <tr key={student.id || student.uid} className="border-t hover:bg-gray-50">
                      <td className="p-2">{student.name}</td>
                      <td className="p-2 text-gray-600">{student.email}</td>
                      <td className="p-2 text-gray-600">{student.phone}</td>
                      <td className="p-2 font-mono text-xs bg-gray-50">{student.loginCode}</td>
                      <td className="p-2">{student.activeSubjects?.length || 0}</td>
                      <td className="p-2 flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openSubjectsModal(student)} className="text-green-600 border-green-200 hover:bg-green-50">
                          <Book className="w-4 h-4 ml-1" /> المواد
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditModal(student)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Edit className="w-4 h-4 ml-1" /> تعديل
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteStudent(student.id || student.uid)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 ml-1" /> حذف
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* طلاب غير مسجلين */}
        {unassignedStudents.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="text-gray-600" />
                <h3 className="font-semibold">طلاب غير مسجلين</h3>
              </div>
              <span className="text-sm text-gray-700">{unassignedStudents.length} طالب</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2">الاسم</th>
                    <th className="p-2">البريد</th>
                    <th className="p-2">الهاتف</th>
                    <th className="p-2">الكود</th>
                    <th className="p-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedStudents.map(student => (
                    <tr key={student.id || student.uid} className="border-t hover:bg-gray-50">
                      <td className="p-2">{student.name}</td>
                      <td className="p-2">{student.email}</td>
                      <td className="p-2">{student.phone}</td>
                      <td className="p-2 font-mono text-xs bg-gray-50">{student.loginCode}</td>
                      <td className="p-2 flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(student)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Edit className="w-4 h-4 ml-1" /> تسجيل طالب
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteStudent(student.id || student.uid)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 ml-1" /> حذف
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* نافذة التعديل */}
      <AnimatePresence>
        {isEditModalOpen && currentStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Edit className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">تعديل بيانات الطالب</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="studentName">اسم الطالب</Label>
                    <Input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                  </div>

                  <div>
                    <Label htmlFor="studentEmail" className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> البريد الإلكتروني
                    </Label>
                    <Input id="studentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="studentPhone" className="flex items-center gap-1">
                        <Phone className="w-4 h-4" /> رقم الهاتف
                      </Label>
                      <Input id="studentPhone" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} />
                    </div>

                    <div>
                      <Label htmlFor="loginCode" className="flex items-center gap-1">
                        <User className="w-4 h-4" /> كود الدخول
                      </Label>
                      <Input id="loginCode" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="studentPassword" className="flex items-center gap-1">
                      <Key className="w-4 h-4" /> كلمة المرور الجديدة
                    </Label>
                    <Input id="studentPassword" type="password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} />
                    <p className="text-xs text-gray-500">اتركه فارغاً للحفاظ على كلمة المرور الحالية</p>
                  </div>

                  <div>
                    <Label htmlFor="stageSelect">المرحلة التعليمية</Label>
                    <Select value={assignedStageId} onValueChange={setAssignedStageId}>
                      <SelectTrigger id="stageSelect">
                        <SelectValue placeholder="اختر المرحلة التعليمية" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationalStages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isLoading}>إلغاء</Button>
                  <Button onClick={handleUpdateStudent} disabled={isLoading || !studentName.trim()} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'} <Save className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة المواد */}
      <AnimatePresence>
        {isSubjectsModalOpen && currentStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Book className="w-5 h-5 text-green-600" />
                  <div>
                    <h2 className="text-lg font-semibold">إدارة المواد التعليمية</h2>
                    <p className="text-sm text-gray-600">{currentStudent.name}</p>
                  </div>
                </div>

                {isLoadingSubjects ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                    <span className="mr-3">جاري تحميل المواد...</span>
                  </div>
                ) : availableSubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">لا توجد مواد متاحة للمرحلة الحالية</p>
                    <p className="text-sm text-gray-500 mt-1">تأكد من إضافة المواد للمرحلة أولاً من إعدادات المناهج</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSubjects(availableSubjects.map(s => s.id))} className="text-xs">تحديد الكل</Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedSubjects([])} className="text-xs">إلغاء الكل</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {availableSubjects.map(subject => (
                        <div key={subject.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <Checkbox id={`subject-${subject.id}`} checked={selectedSubjects.includes(subject.id)} onCheckedChange={() => {
                            setSelectedSubjects(prev => prev.includes(subject.id) ? prev.filter(id => id !== subject.id) : [...prev, subject.id]);
                          }} />
                          <Label htmlFor={`subject-${subject.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{subject.name}</div>
                            <div className="text-xs text-gray-500">{subject.semester}</div>
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setIsSubjectsModalOpen(false)} disabled={isLoading}>إلغاء</Button>
                      <Button onClick={handleUpdateSubjects} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                        {isLoading ? 'جاري الحفظ...' : `حفظ المواد (${selectedSubjects.length})`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageStudentsPage;
