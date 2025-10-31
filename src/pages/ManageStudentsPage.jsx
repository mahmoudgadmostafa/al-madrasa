import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Users, Edit, Trash2, Save, ArrowLeft, Book, BookOpen, BookX, Settings, Phone, Key, User, Mail, UserPlus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import AddUserModal from '@/components/admin/AddUserModal';

// مكون Checkbox
const Checkbox = ({ checked, onCheckedChange, id, disabled = false }) => {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
};

const ManageStudentsPage = () => {
  // الحالات الأساسية
  const [students, setStudents] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // حالات النوافذ المنبثقة
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  
  // بيانات النماذج
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [assignedStageId, setAssignedStageId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const db = getFirestore();
  const navigate = useNavigate();

  // دالة التعامل مع حفظ المستخدم الجديد
  const handleUserSaved = useCallback((savedUser, isNew) => {
    if (isNew) {
      setStudents(prev => [...prev, savedUser]);
      toast({
        title: "تم الإنشاء بنجاح",
        description: "تم إنشاء حساب الطالب الجديد بنجاح"
      });
    } else {
      setStudents(prev => prev.map(s => (s.id === savedUser.id ? savedUser : s)));
      toast({
        title: "تم التحديث بنجاح", 
        description: "تم تحديث بيانات الطالب بنجاح"
      });
    }
  }, []);

  // 🔄 دالة محسنة لجلب المواد مع معالجة أفضل للأسماء
  const fetchSubjectsForStage = useCallback(async (stageId) => {
    if (!stageId) {
      console.log("❌ لا توجد stageId محددة");
      return [];
    }
    
    try {
      console.log("🎯 جاري جلب المواد للمرحلة:", stageId);
      
      const curriculumRef = doc(db, "curriculum", stageId);
      const curriculumDoc = await getDoc(curriculumRef);
      
      if (curriculumDoc.exists()) {
        const data = curriculumDoc.data();
        console.log("📖 بيانات المنهج كاملة:", data);
        
        // معالجة المواد من الفصلين
        const allSubjects = [];
        
        // مواد الفصل الأول
        if (data.semesterOneSubjects && Array.isArray(data.semesterOneSubjects)) {
          data.semesterOneSubjects.forEach(subject => {
            if (subject && subject.id) {
              // استخدام الحقول المختلفة المحتملة لاسم المادة
              const subjectName = subject.title || subject.name || subject.subjectName || `مادة ${subject.id}`;
              
              allSubjects.push({
                id: subject.id,
                name: subjectName,
                semester: 'الفصل الأول',
                type: 'semesterOne'
              });
            }
          });
        }
        
        // مواد الفصل الثاني
        if (data.semesterTwoSubjects && Array.isArray(data.semesterTwoSubjects)) {
          data.semesterTwoSubjects.forEach(subject => {
            if (subject && subject.id) {
              // استخدام الحقول المختلفة المحتملة لاسم المادة
              const subjectName = subject.title || subject.name || subject.subjectName || `مادة ${subject.id}`;
              
              allSubjects.push({
                id: subject.id,
                name: subjectName,
                semester: 'الفصل الثاني',
                type: 'semesterTwo'
              });
            }
          });
        }
        
        console.log("✅ المواد التي تم جلبها:", allSubjects);
        return allSubjects;
      } else {
        console.log("⚠️ لا يوجد منهج للمرحلة:", stageId);
        return [];
      }
    } catch (error) {
      console.error("❌ خطأ في جلب المواد:", error);
      return [];
    }
  }, [db]);

  // 📥 جلب البيانات الأساسية
  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      // جلب بيانات الطلاب
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = studentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || doc.id, // استخدام UID من البيانات أو معرف المستند
          name: data.name || 'بدون اسم',
          email: data.email || 'بدون بريد',
          phone: data.phone || 'غير محدد',
          loginCode: data.loginCode || 'غير محدد',
          password: data.password || 'غير محدد', // إذا كان موجوداً في البيانات
          stageId: data.stageId || '',
          grade: data.grade || '',
          role: data.role || 'student',
          activeSubjects: Array.isArray(data.activeSubjects) ? data.activeSubjects : [],
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        };
      });
      setStudents(fetchedStudents);

      // جلب المراحل التعليمية
      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        const stages = Array.isArray(settingsData.educationalStages) ? settingsData.educationalStages : [];
        setEducationalStages(stages);
        console.log("📊 المراحل التعليمية:", stages);
      } else {
        console.log("⚠️ لا توجد إعدادات للمراحل التعليمية");
        setEducationalStages([]);
      }

    } catch (error) {
      console.error("❌ خطأ في تحميل البيانات:", error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "تعذر تحميل بيانات الطلاب والإعدادات",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  }, [db]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ✏️ فتح نافذة التعديل
  const openEditModal = useCallback((student) => {
    if (!student) return;
    
    setCurrentStudent(student);
    setStudentName(student.name || '');
    setStudentEmail(student.email || '');
    setStudentPhone(student.phone || '');
    setLoginCode(student.loginCode || '');
    setStudentPassword(student.password || ''); // إذا كان موجوداً
    setAssignedStageId(student.stageId || '');
    setIsEditModalOpen(true);
  }, []);

  // 📚 فتح نافذة المواد
  const openSubjectsModal = useCallback(async (student) => {
    if (!student) return;
    
    setCurrentStudent(student);
    setSelectedSubjects(Array.isArray(student.activeSubjects) ? student.activeSubjects : []);
    setIsLoadingSubjects(true);
    
    if (student.stageId) {
      console.log("🎯 فتح نافذة المواد للطالب:", student.name, "المرحلة:", student.stageId);
      
      const subjects = await fetchSubjectsForStage(student.stageId);
      setAvailableSubjects(subjects);
      setIsLoadingSubjects(false);
      
      if (subjects.length === 0) {
        toast({
          title: "لا توجد مواد",
          description: `لم يتم إضافة أي مواد للمرحلة ${educationalStages.find(s => s.id === student.stageId)?.name || ''} بعد`,
          variant: "destructive"
        });
      }
    } else {
      console.log("❌ الطالب ليس لدية مرحلة محددة");
      setAvailableSubjects([]);
      setIsLoadingSubjects(false);
      toast({
        title: "تنبيه",
        description: "الطالب غير مسجل في أي مرحلة. يرجى تعيين مرحلة أولاً.",
        variant: "destructive"
      });
    }
    
    setIsSubjectsModalOpen(true);
  }, [fetchSubjectsForStage, educationalStages]);

  // 💾 تحديث بيانات الطالب
  const handleUpdateStudent = async () => {
    if (!currentStudent || !studentName.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال اسم الطالب",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const studentData = {
        name: studentName.trim(),
        email: studentEmail.trim(),
        phone: studentPhone.trim(),
        loginCode: loginCode.trim(),
        stageId: assignedStageId,
        grade: educationalStages.find(s => s.id === assignedStageId)?.name || '',
        updatedAt: new Date()
      };

      // إضافة كلمة المرور فقط إذا تم إدخالها
      if (studentPassword.trim()) {
        studentData.password = studentPassword.trim();
      }

      const studentDocRef = doc(db, "users", currentStudent.id);
      await updateDoc(studentDocRef, studentData);

      // تحديث الحالة المحلية
      setStudents(prev => prev.map(s =>
        s.id === currentStudent.id ? { 
          ...s, 
          ...studentData,
          grade: educationalStages.find(stage => stage.id === assignedStageId)?.name || ''
        } : s
      ));

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الطالب"
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("❌ خطأ في تحديث الطالب:", error);
      toast({
        title: "خطأ في التحديث",
        description: "تعذر تحديث بيانات الطالب",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 💾 تحديث المواد
  const handleUpdateSubjects = async () => {
    if (!currentStudent) return;

    setIsLoading(true);
    try {
      const studentDocRef = doc(db, "users", currentStudent.id);
      await updateDoc(studentDocRef, {
        activeSubjects: selectedSubjects,
        updatedAt: new Date()
      });

      // تحديث الحالة المحلية
      setStudents(prev => prev.map(s =>
        s.id === currentStudent.id ? { ...s, activeSubjects: selectedSubjects } : s
      ));

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث ${selectedSubjects.length} مادة للطالب`
      });
      setIsSubjectsModalOpen(false);
    } catch (error) {
      console.error("❌ خطأ في تحديث المواد:", error);
      toast({
        title: "خطأ في التحديث",
        description: "تعذر تحديث المواد التعليمية",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔘 التحكم في المواد
  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    if (availableSubjects.length === 0) return;
    const allSubjectIds = availableSubjects.map(subject => subject.id);
    setSelectedSubjects(allSubjectIds);
  };

  const handleDeselectAllSubjects = () => {
    setSelectedSubjects([]);
  };

  // 🗑️ حذف الطالب
  const handleDeleteStudent = async (studentId) => {
    if (!studentId) return;

    const confirmDelete = window.confirm(
      "هل أنت متأكد أنك تريد حذف هذا الطالب؟ سيتم حذف جميع بياناته بشكل دائم."
    );

    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف بيانات الطالب"
      });
    } catch (error) {
      console.error("❌ خطأ في حذف الطالب:", error);
      toast({
        title: "خطأ في الحذف",
        description: "تعذر حذف الطالب",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 📊 تجميع الطلاب حسب المرحلة
  const studentsByStage = educationalStages.map(stage => ({
    ...stage,
    students: students.filter(student => student.stageId === stage.id)
  }));

  const unassignedStudents = students.filter(student =>
    !student.stageId || !educationalStages.some(s => s.id === student.stageId)
  );

  // 🎯 دالة مساعدة
  const getActiveSubjectsCount = (student) => {
    return Array.isArray(student?.activeSubjects) ? student.activeSubjects.length : 0;
  };

  // ⏳ عرض التحميل
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="text-lg text-gray-600">جاري تحميل بيانات الطلاب...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 🎯 الهيدر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">إدارة الطلاب</h1>
            <p className="text-gray-600 mt-1">
              إدارة حسابات الطلاب والمواد التعليمية ({students.length} طالب)
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/admin')}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للوحة التحكم
        </Button>
      </div>

      {/* زر إنشاء حساب طالب جديد */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">قائمة الطلاب</h2>
          <p className="text-gray-600">إدارة حسابات الطلاب والمواد التعليمية</p>
        </div>
        <Button 
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="ml-2 h-5 w-5" />
          إنشاء حساب طالب
        </Button>
      </div>

      {/* مكون إنشاء حساب طالب جديد */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={handleUserSaved}
        db={db}
        defaultRole="student"
        educationalStages={educationalStages}
      />

      {/* ✏️ نافذة تعديل الطالب */}
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
                  <div className="space-y-2">
                    <Label htmlFor="studentName">اسم الطالب</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="أدخل اسم الطالب"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentEmail" className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="البريد الإلكتروني"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="studentPhone" className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        رقم الهاتف
                      </Label>
                      <Input
                        id="studentPhone"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="رقم الهاتف"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loginCode" className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        كود الدخول
                      </Label>
                      <Input
                        id="loginCode"
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value)}
                        placeholder="كود الدخول"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentPassword" className="flex items-center gap-1">
                      <Key className="w-4 h-4" />
                      كلمة المرور الجديدة
                    </Label>
                    <Input
                      id="studentPassword"
                      type="password"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="اتركه فارغاً للحفاظ على كلمة المرور الحالية"
                    />
                    <p className="text-xs text-gray-500">اتركه فارغاً للحفاظ على كلمة المرور الحالية</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stageSelect">المرحلة التعليمية</Label>
                    <Select value={assignedStageId} onValueChange={setAssignedStageId}>
                      <SelectTrigger id="stageSelect">
                        <SelectValue placeholder="اختر المرحلة التعليمية" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationalStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isLoading}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleUpdateStudent}
                    disabled={isLoading || !studentName.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 📚 نافذة إدارة المواد */}
      <AnimatePresence>
        {isSubjectsModalOpen && currentStudent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Book className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    إدارة المواد - {currentStudent.name}
                  </h2>
                </div>
                
                {/* معلومات المرحلة */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <p className="text-blue-800 font-medium">
                        المرحلة: {educationalStages.find(s => s.id === currentStudent.stageId)?.name || 'غير معروفة'}
                      </p>
                      <p className="text-blue-600 text-sm mt-1">
                        تحكم في إظهار أو إخفاء المواد للطالب
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllSubjects}
                        disabled={availableSubjects.length === 0 || isLoadingSubjects}
                      >
                        تفعيل الكل
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeselectAllSubjects}
                        disabled={isLoadingSubjects}
                      >
                        إخفاء الكل
                      </Button>
                    </div>
                  </div>
                </div>

                {/* الإحصائيات */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium">المفعلة</p>
                    <p className="text-2xl font-bold text-green-600">{selectedSubjects.length}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-800 font-medium">الإجمالي</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {isLoadingSubjects ? '...' : availableSubjects.length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-800 font-medium">النسبة</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {isLoadingSubjects ? '...' : 
                       availableSubjects.length > 0 
                        ? `${Math.round((selectedSubjects.length / availableSubjects.length) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>

                {/* قائمة المواد */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    المواد المتاحة ({isLoadingSubjects ? 'جاري التحميل...' : `${availableSubjects.length} مادة`})
                  </h3>
                  
                  {isLoadingSubjects ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">جاري تحميل المواد...</p>
                    </div>
                  ) : availableSubjects.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                            selectedSubjects.includes(subject.id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`subject-${subject.id}`}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={() => handleSubjectToggle(subject.id)}
                              disabled={isLoading}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`subject-${subject.id}`}
                                className="flex items-center gap-2 cursor-pointer mb-1"
                              >
                                <BookOpen className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-gray-900">{subject.name}</span>
                              </Label>
                              <div className="text-xs text-gray-500">
                                <div>📅 {subject.semester}</div>
                                <div>🆔 {subject.id}</div>
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedSubjects.includes(subject.id)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {selectedSubjects.includes(subject.id) ? '🟢 مفعل' : '🔴 مخفي'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">لا توجد مواد</p>
                      <p className="text-gray-500 text-sm">
                        لم يتم إضافة مواد لهذه المرحلة بعد
                      </p>
                    </div>
                  )}
                </div>

                {/* أزرار الحفظ */}
                <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setIsSubjectsModalOpen(false)}
                    disabled={isLoading}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleUpdateSubjects}
                    disabled={isLoading || availableSubjects.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="ml-2 h-4 w-4" />
                        حفظ
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 📋 قائمة الطلاب */}
      <div className="space-y-6">
        {/* الطلاب حسب المرحلة */}
        {studentsByStage.map((stage) => (
          <div key={stage.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <Book className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">{stage.name}</h3>
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-auto">
                  {stage.students.length} طالب
                </div>
              </div>
            </div>
            
            <div className="p-0">
              {stage.students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-right p-4 font-semibold text-gray-700">الاسم</th>
                        <th className="text-right p-4 font-semibold text-gray-700">البريد</th>
                        <th className="text-right p-4 font-semibold text-gray-700">رقم الهاتف</th>
                        <th className="text-right p-4 font-semibold text-gray-700">كود الدخول</th>
                        <th className="text-right p-4 font-semibold text-gray-700">المواد النشطة</th>
                        <th className="text-right p-4 font-semibold text-gray-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.students.map((student) => (
                        <tr key={student.id} className="border-t hover:bg-gray-50">
                          <td className="p-4 font-medium text-gray-900">{student.name}</td>
                          <td className="p-4 text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4 text-gray-500" />
                              {student.email}
                            </div>
                          </td>
                          <td className="p-4 text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-gray-500" />
                              {student.phone}
                            </div>
                          </td>
                          <td className="p-4 text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-gray-500" />
                              {student.loginCode}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`px-3 py-2 rounded-lg text-sm w-fit ${
                              getActiveSubjectsCount(student) > 0 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{getActiveSubjectsCount(student)} مادة</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(student)}
                                disabled={isLoading}
                              >
                                <Edit className="w-4 h-4" />
                                تعديل
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openSubjectsModal(student)}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Settings className="w-4 h-4" />
                                المواد
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteStudent(student.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="w-4 h-4" />
                                حذف
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">لا يوجد طلاب في هذه المرحلة</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* الطلاب غير المسجلين */}
        {unassignedStudents.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-100 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-red-600" />
                <h3 className="text-xl font-bold text-red-800">طلاب غير مسجلين</h3>
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium mr-auto">
                  {unassignedStudents.length} طالب
                </div>
              </div>
            </div>
            
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="text-right p-4 font-semibold text-red-800">الاسم</th>
                      <th className="text-right p-4 font-semibold text-red-800">البريد</th>
                      <th className="text-right p-4 font-semibold text-red-800">رقم الهاتف</th>
                      <th className="text-right p-4 font-semibold text-red-800">كود الدخول</th>
                      <th className="text-right p-4 font-semibold text-red-800">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map((student) => (
                      <tr key={student.id} className="border-t border-red-200 hover:bg-red-100">
                        <td className="p-4 font-medium text-red-900">{student.name}</td>
                        <td className="p-4 text-red-700">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-red-500" />
                            {student.email}
                          </div>
                        </td>
                        <td className="p-4 text-red-700">
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-red-500" />
                            {student.phone}
                          </div>
                        </td>
                        <td className="p-4 text-red-700">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-red-500" />
                            {student.loginCode}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(student)}
                              disabled={isLoading}
                            >
                              <Edit className="w-4 h-4" />
                              تعيين مرحلة
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteStudent(student.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* حالة عدم وجود طلاب */}
        {students.length === 0 && !isFetching && (
          <div className="bg-white rounded-lg shadow-sm border text-center py-16">
            <Users className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">لا يوجد طلاب</h3>
            <p className="text-gray-600 text-lg">
              لم يتم إضافة أي طلاب إلى النظام بعد
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageStudentsPage;
