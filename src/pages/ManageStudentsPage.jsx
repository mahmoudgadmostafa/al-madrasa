import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import {
  Users, Edit, Trash2, Save, ArrowLeft, Book, BookOpen, BookX,
  Phone, Key, User, Mail, UserPlus, Download, Search, X, Filter
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc
} from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import AddUserModal from '@/components/admin/AddUserModal';
import * as XLSX from "xlsx";

const Checkbox = ({ checked, onCheckedChange, id, disabled = false }) => (
  <input type="checkbox" id={id} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} disabled={disabled}
    className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" />
);

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [assignedStageId, setAssignedStageId] = useState('');

  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [exportStage, setExportStage] = useState("all");

  const db = getFirestore();
  const navigate = useNavigate();

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

  const handleExportToExcel = () => {
    if (!students || students.length === 0) {
      toast({ title: "لا توجد بيانات", description: "قائمة الطلاب فارغة.", variant: "destructive" });
      return;
    }
    const wb = XLSX.utils.book_new();
    const createSheetData = (data) => data.map((s) => ({ الاسم: s.name || "", الكود: s.loginCode || "", البريد_الإلكتروني: s.email || "", رقم_الهاتف: s.phone || "", المرحلة: s.grade || "", الدور: s.role || "" }));
    if (exportStage !== "all") {
      const stage = educationalStages.find((st) => st.id === exportStage);
      const stageName = stage?.name || "مرحلة غير معروفة";
      const filtered = students.filter((s) => s.stageId === exportStage);
      if (filtered.length === 0) { toast({ title: "لا يوجد طلاب للتصدير", description: `لا توجد سجلات في ${stageName}.`, variant: "destructive" }); return; }
      const ws = XLSX.utils.json_to_sheet(createSheetData(filtered));
      XLSX.utils.book_append_sheet(wb, ws, stageName);
      XLSX.writeFile(wb, `تصدير_${stageName}.xlsx`);
      toast({ title: "تم التصدير", description: `تم تصدير ${filtered.length} طالبًا.` });
      return;
    }
    educationalStages.forEach((stage) => {
      const filtered = students.filter((s) => s.stageId === stage.id);
      const ws = XLSX.utils.json_to_sheet(createSheetData(filtered));
      XLSX.utils.book_append_sheet(wb, ws, stage.name);
    });
    const wsAll = XLSX.utils.json_to_sheet(createSheetData(students));
    XLSX.utils.book_append_sheet(wb, wsAll, "جميع الطلاب");
    XLSX.writeFile(wb, "تقرير_الطلاب.xlsx");
    toast({ title: "تم التصدير بنجاح", description: "تم إنشاء ملف Excel متعدد الأوراق." });
  };

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
      console.error("خطأ في جلب المواد:", error);
      return [];
    } finally {
      setIsLoadingSubjects(false);
    }
  }, [db]);

  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = studentsSnapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return { id: docSnap.id, uid: d.uid || docSnap.id, name: d.name || '', email: d.email || '', phone: d.phone || '', loginCode: d.loginCode || '', password: d.password || '', stageId: d.stageId || '', grade: d.grade || '', role: d.role || 'student', activeSubjects: Array.isArray(d.activeSubjects) ? d.activeSubjects : [], createdAt: d.createdAt || null };
      });
      setStudents(fetchedStudents);
      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        setEducationalStages(Array.isArray(settingsData.educationalStages) ? settingsData.educationalStages : []);
      } else setEducationalStages([]);
    } catch (error) {
      console.error("خطأ في التحميل:", error);
      toast({ title: "خطأ", description: "تعذر تحميل البيانات.", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  }, [db]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

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

  const handleUpdateStudent = async () => {
    if (!currentStudent || !studentName.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم الطالب.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const studentDocId = currentStudent.id || currentStudent.uid;
      if (!studentDocId) throw new Error("لم يتم العثور على معرف الطالب.");
      const studentData = { name: studentName.trim(), email: studentEmail.trim(), phone: studentPhone.trim(), loginCode: String(loginCode || "").trim(), stageId: assignedStageId || '', grade: educationalStages.find(s => s.id === assignedStageId)?.name || '', updatedAt: new Date() };
      if (studentPassword && studentPassword.trim()) studentData.password = studentPassword.trim();
      await updateDoc(doc(db, "users", studentDocId), studentData);
      setStudents(prev => prev.map(s => (s.id === studentDocId || s.uid === studentDocId) ? { ...s, ...studentData } : s));
      const stageName = educationalStages.find(s => s.id === assignedStageId)?.name || '';
      toast({ title: "تم الحفظ", description: stageName ? `تم نقل الطالب إلى مرحلة ${stageName}` : "تم تحديث بيانات الطالب." });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("خطأ أثناء التحديث:", error);
      toast({ title: "خطأ", description: "تعذر حفظ التغييرات.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubjects = async () => {
    if (!currentStudent) return;
    setIsLoading(true);
    try {
      const studentDocId = currentStudent.id || currentStudent.uid;
      if (!studentDocId) throw new Error("لم يتم العثور على معرف الطالب.");
      await updateDoc(doc(db, "users", studentDocId), { activeSubjects: selectedSubjects, updatedAt: new Date() });
      setStudents(prev => prev.map(s => (s.id === studentDocId || s.uid === studentDocId) ? { ...s, activeSubjects: selectedSubjects } : s));
      toast({ title: "تم الحفظ", description: "تم تحديث المواد للطالب." });
      setIsSubjectsModalOpen(false);
    } catch (error) {
      toast({ title: "خطأ", description: "تعذر تحديث المواد.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!studentId || !window.confirm("هل أنت متأكد أنك تريد حذف هذا الطالب؟")) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast({ title: "تم الحذف", description: "تم حذف الطالب بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: "تعذر حذف الطالب.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || s.loginCode?.toString().includes(searchQuery)
  );

  const studentsByStage = educationalStages.map(stage => ({ ...stage, students: filteredStudents.filter(s => s.stageId === stage.id) }));
  const unassignedStudents = filteredStudents.filter(s => !s.stageId || !educationalStages.some(e => e.id === s.stageId));

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 30%, #1e3a5f 60%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-200 text-lg">جاري تحميل بيانات الطلاب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 30%, #1e3a5f 60%, #0f172a 100%)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }}></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #059669, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">إدارة الطلاب</h1>
                <p className="text-emerald-300 text-sm mt-1">{students.length} طالب مسجل في النظام</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all duration-200 self-start sm:self-auto">
              <ArrowLeft className="w-4 h-4" /> العودة للوحة التحكم
            </button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'إجمالي الطلاب', value: students.length, color: '#10b981' },
            { label: 'المراحل الدراسية', value: educationalStages.length, color: '#059669' },
            { label: 'نتائج الفلتر', value: filteredStudents.length, color: '#34d399' },
            { label: 'غير مسجلين', value: unassignedStudents.length, color: '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 border border-emerald-500/20 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <p className="text-white font-bold text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-emerald-300 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Action Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو البريد أو الكود..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-emerald-500/30 text-white placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <button onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <UserPlus className="w-4 h-4" /> إضافة طالب
          </button>
        </motion.div>

        {/* Export Row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl border border-emerald-500/20" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>تصدير Excel:</span>
          </div>
          <Select value={exportStage} onValueChange={setExportStage}>
            <SelectTrigger className="border-emerald-500/30 text-white w-full sm:w-56" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <SelectValue placeholder="اختر المرحلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المراحل</SelectItem>
              {educationalStages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={handleExportToExcel} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:opacity-90 whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
            <Download className="w-4 h-4" /> تصدير
          </button>
        </motion.div>

        <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSave={handleUserSaved} db={db} defaultRole="student" educationalStages={educationalStages} />

        {/* Students by Stage */}
        <div className="space-y-4">
          <AnimatePresence>
            {studentsByStage.map((stage, stageIndex) => (
              <motion.div key={stage.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stageIndex * 0.05 }}
                className="rounded-2xl border border-emerald-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                <div className="px-5 py-4 border-b border-emerald-500/20 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-white">{stage.name}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-emerald-300 border border-emerald-500/30" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    {stage.students.length} طالب
                  </span>
                </div>

                {stage.students.length === 0 ? (
                  <div className="py-8 text-center text-emerald-400/60 text-sm">لا يوجد طلاب في هذه المرحلة</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" dir="rtl">
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                          {['الاسم', 'البريد', 'الهاتف', 'الكود', 'مواد', 'إجراءات'].map(h => (
                            <th key={h} className="px-4 py-3 text-right text-emerald-300 text-xs font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-500/10">
                        {stage.students.map(student => (
                          <tr key={student.id || student.uid} className="hover:bg-emerald-500/5 transition-colors duration-150">
                            <td className="px-4 py-3 text-white font-medium">{student.name}</td>
                            <td className="px-4 py-3 text-emerald-200/70 text-xs">{student.email}</td>
                            <td className="px-4 py-3 text-emerald-200/70 text-xs">{student.phone}</td>
                            <td className="px-4 py-3"><span className="font-mono text-xs px-2 py-1 rounded-md text-emerald-300" style={{ background: 'rgba(16,185,129,0.1)' }}>{student.loginCode}</span></td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-emerald-300" style={{ background: 'rgba(16,185,129,0.15)' }}>{student.activeSubjects?.length || 0}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 justify-end flex-wrap">
                                <button onClick={() => openSubjectsModal(student)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/15 transition-colors duration-150 flex items-center gap-1">
                                  <Book className="w-3 h-3" /> المواد
                                </button>
                                <button onClick={() => openEditModal(student)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/15 transition-colors duration-150 flex items-center gap-1">
                                  <Edit className="w-3 h-3" /> تعديل
                                </button>
                                <button onClick={() => handleDeleteStudent(student.id || student.uid)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/30 hover:bg-red-500/15 transition-colors duration-150 flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" /> حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Unassigned Students */}
          {unassignedStudents.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <div className="px-5 py-4 border-b border-amber-500/20 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-white">طلاب غير مسجلين</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-amber-300 border border-amber-500/30" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  {unassignedStudents.length} طالب
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {['الاسم', 'البريد', 'الهاتف', 'الكود', 'إجراءات'].map(h => (
                        <th key={h} className="px-4 py-3 text-right text-amber-300 text-xs font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-500/10">
                    {unassignedStudents.map(student => (
                      <tr key={student.id || student.uid} className="hover:bg-amber-500/5 transition-colors duration-150">
                        <td className="px-4 py-3 text-white font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-amber-200/70 text-xs">{student.email}</td>
                        <td className="px-4 py-3 text-amber-200/70 text-xs">{student.phone}</td>
                        <td className="px-4 py-3"><span className="font-mono text-xs px-2 py-1 rounded-md text-amber-300" style={{ background: 'rgba(245,158,11,0.1)' }}>{student.loginCode}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end flex-wrap">
                            <button onClick={() => openEditModal(student)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/15 transition-colors duration-150 flex items-center gap-1">
                              <Edit className="w-3 h-3" /> تسجيل
                            </button>
                            <button onClick={() => handleDeleteStudent(student.id || student.uid)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/30 hover:bg-red-500/15 transition-colors duration-150 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && currentStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a, #064e3b)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                      <Edit className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">تعديل بيانات الطالب</h2>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'اسم الطالب', value: studentName, onChange: setStudentName, placeholder: 'الاسم الكامل', icon: User },
                    { label: 'البريد الإلكتروني', value: studentEmail, onChange: setStudentEmail, placeholder: 'email@example.com', icon: Mail, type: 'email' },
                  ].map((field, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className="text-emerald-200 text-sm flex items-center gap-1.5">
                        <field.icon className="w-3.5 h-3.5" /> {field.label}
                      </Label>
                      <input type={field.type || 'text'} value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/30 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 text-sm transition-all"
                        style={{ background: 'rgba(255,255,255,0.07)' }} />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'رقم الهاتف', value: studentPhone, onChange: setStudentPhone, icon: Phone },
                      { label: 'كود الدخول', value: loginCode, onChange: setLoginCode, icon: Key },
                    ].map((field, i) => (
                      <div key={i} className="space-y-1.5">
                        <Label className="text-emerald-200 text-sm flex items-center gap-1.5">
                          <field.icon className="w-3.5 h-3.5" /> {field.label}
                        </Label>
                        <input value={field.value} onChange={(e) => field.onChange(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/30 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 text-sm transition-all"
                          style={{ background: 'rgba(255,255,255,0.07)' }} />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-emerald-200 text-sm">كلمة المرور الجديدة</Label>
                    <input type="password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} placeholder="اتركه فارغاً للإبقاء على الحالية"
                      className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/30 text-white placeholder-emerald-400/40 focus:outline-none focus:border-emerald-400 text-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-emerald-200 text-sm">المرحلة التعليمية</Label>
                    <Select value={assignedStageId} onValueChange={setAssignedStageId}>
                      <SelectTrigger className="border-emerald-500/30 text-white" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <SelectValue placeholder="اختر المرحلة" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationalStages.map(stage => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setIsEditModalOpen(false)} disabled={isLoading}
                    className="flex-1 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10 transition-all text-sm font-medium">
                    إلغاء
                  </button>
                  <button onClick={handleUpdateStudent} disabled={isLoading || !studentName.trim()}
                    className="flex-1 py-2.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subjects Modal */}
      <AnimatePresence>
        {isSubjectsModalOpen && currentStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a, #064e3b)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                      <Book className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">إدارة المواد التعليمية</h2>
                      <p className="text-emerald-300 text-xs">{currentStudent.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSubjectsModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isLoadingSubjects ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span className="text-emerald-300">جاري تحميل المواد...</span>
                  </div>
                ) : availableSubjects.length === 0 ? (
                  <div className="text-center py-12">
                    <BookX className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" />
                    <p className="text-emerald-200">لا توجد مواد متاحة للمرحلة الحالية</p>
                    <p className="text-sm text-emerald-400/60 mt-1">تأكد من إضافة المواد للمرحلة أولاً</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <button onClick={() => setSelectedSubjects(availableSubjects.map(s => s.id))} className="px-3 py-1.5 text-xs rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors">تحديد الكل</button>
                      <button onClick={() => setSelectedSubjects([])} className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors">إلغاء الكل</button>
                      <span className="px-3 py-1.5 text-xs rounded-lg text-emerald-300 mr-auto" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        {selectedSubjects.length} محدد من {availableSubjects.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 max-h-72 overflow-y-auto pr-1">
                      {availableSubjects.map(subject => (
                        <label key={subject.id} htmlFor={`subject-${subject.id}`} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150"
                          style={{ background: selectedSubjects.includes(subject.id) ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', borderColor: selectedSubjects.includes(subject.id) ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.15)' }}>
                          <Checkbox id={`subject-${subject.id}`} checked={selectedSubjects.includes(subject.id)} onCheckedChange={() => setSelectedSubjects(prev => prev.includes(subject.id) ? prev.filter(id => id !== subject.id) : [...prev, subject.id])} />
                          <div>
                            <p className="text-white text-sm font-medium">{subject.name}</p>
                            <p className="text-emerald-400 text-xs">{subject.semester}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsSubjectsModalOpen(false)} disabled={isLoading} className="flex-1 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10 transition-all text-sm font-medium">إلغاء</button>
                      <button onClick={handleUpdateSubjects} disabled={isLoading} className="flex-1 py-2.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                        حفظ المواد ({selectedSubjects.length})
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageStudentsPage;
