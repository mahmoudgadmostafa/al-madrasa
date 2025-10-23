import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "@/components/ui/use-toast";
import { Users, UserPlus, Edit, Trash2, Save, ArrowLeft, Book, BookOpen, BookX, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import AddUserModal from '@/components/admin/AddUserModal';

const ManageStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [assignedStageId, setAssignedStageId] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const db = getFirestore();
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      // جلب بيانات الطلاب
      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = studentsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        activeSubjects: doc.data().activeSubjects || [] // المواد النشطة للطالب
      }));
      setStudents(fetchedStudents);

      // جلب المراحل التعليمية
      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        setEducationalStages(settingsData.educationalStages || []);
        setSubjects(settingsData.subjects || []); // المواد التعليمية
      } else {
        setEducationalStages([]);
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "خطأ", description: "فشل في تحميل البيانات الأولية.", variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  }, [db]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const openModalForEdit = (student) => {
    setCurrentStudent(student);
    setStudentName(student.name || '');
    setAssignedStageId(student.stageId || '');
    setIsEditModalOpen(true);
  };

  const openSubjectsModal = (student) => {
    setCurrentStudent(student);
    setSelectedSubjects(student.activeSubjects || []);
    setIsSubjectsModalOpen(true);
  };

  const handleUserSaved = (savedUser, isNew) => {
    if (isNew && savedUser.role === 'student') {
      setStudents(prev => [...prev, {...savedUser, activeSubjects: []}]);
    } else if (!isNew) {
      setStudents(prev => prev.map(s => (s.id === savedUser.id ? {...savedUser, activeSubjects: s.activeSubjects} : s)));
    }
  };

  const handleUpdateStudent = async () => {
    if (!studentName.trim() || !assignedStageId) {
      toast({ title: "خطأ في الإدخال", description: "اسم الطالب والمرحلة التعليمية مطلوبان.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const studentData = {
        name: studentName,
        stageId: assignedStageId,
        grade: educationalStages.find(s => s.id === assignedStageId)?.name || 'غير محدد',
      };

      const studentDocRef = doc(db, "users", currentStudent.id);
      await updateDoc(studentDocRef, studentData);

      const updatedStudent = { ...currentStudent, ...studentData };
      handleUserSaved(updatedStudent, false);

      toast({ title: "نجاح", description: "تم تحديث بيانات الطالب بنجاح." });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating student:", error);
      toast({ title: "خطأ", description: `فشل تحديث بيانات الطالب: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubjects = async () => {
    setIsLoading(true);
    try {
      const studentDocRef = doc(db, "users", currentStudent.id);
      await updateDoc(studentDocRef, {
        activeSubjects: selectedSubjects
      });

      // تحديث الحالة المحلية
      setStudents(prev => prev.map(s => 
        s.id === currentStudent.id 
          ? { ...s, activeSubjects: selectedSubjects }
          : s
      ));

      toast({ title: "نجاح", description: "تم تحديث المواد التعليمية للطالب بنجاح." });
      setIsSubjectsModalOpen(false);
    } catch (error) {
      console.error("Error updating student subjects:", error);
      toast({ title: "خطأ", description: `فشل تحديث المواد التعليمية: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAllSubjects = () => {
    const allSubjectIds = subjects.map(subject => subject.id);
    setSelectedSubjects(allSubjectIds);
  };

  const handleDeselectAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const getActiveSubjectsCount = (student) => {
    return student.activeSubjects ? student.activeSubjects.length : 0;
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'مادة غير معروفة';
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا الطالب؟ سيتم حذف بياناته فقط. يجب حذف حساب المصادقة الخاص به يدوياً من Firebase Console لمنعه من تسجيل الدخول.")) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "users", studentId));
      setStudents(students.filter(s => s.id !== studentId));
      toast({ title: "نجاح", description: "تم حذف بيانات الطالب. لا تنسَ حذف حساب المصادقة يدوياً.", duration: 7000 });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({ title: "خطأ", description: "فشل حذف الطالب.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const studentsByStage = educationalStages.map(stage => ({
    ...stage,
    students: students.filter(student => student.stageId === stage.id)
  }));

  const unassignedStudents = students.filter(student => !student.stageId || !educationalStages.some(s => s.id === student.stageId));

  if (isFetching) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div><p className="ml-4 rtl:mr-4 text-lg text-foreground">جاري تحميل بيانات الطلاب...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">إدارة الطلاب</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
            العودة إلى لوحة التحكم
          </Button>
        </div>
        <p className="text-muted-foreground">إنشاء حسابات للطلاب، تعديل بياناتهم، وإدارة المواد التعليمية النشطة لكل طالب.</p>
      </motion.div>

      <Button onClick={() => setIsAddUserModalOpen(true)} className="mb-6">
        <UserPlus className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-5 w-5" />
        إنشاء حساب طالب جديد
      </Button>

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={handleUserSaved}
        db={db}
        defaultRole="student"
        educationalStages={educationalStages}
      />

      {/* Modal تعديل بيانات الطالب */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle>تعديل بيانات الطالب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="studentNameEdit">اسم الطالب</Label>
                  <Input id="studentNameEdit" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="assignedStageIdModalEdit">المرحلة التعليمية</Label>
                  <Select value={assignedStageId || ""} onValueChange={setAssignedStageId}>
                    <SelectTrigger id="assignedStageIdModalEdit">
                      <SelectValue placeholder="اختر المرحلة التعليمية" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationalStages.length > 0 ? (
                        educationalStages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder-no-stages" disabled>لا توجد مراحل معرفة</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleUpdateStudent} disabled={isLoading}>
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  <Save className="mr-1 ml-0 rtl:ml-1 rtl:mr-0 h-4 w-4" />
                </Button>
              </CardFooter>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal إدارة المواد التعليمية */}
      <AnimatePresence>
        {isSubjectsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsSubjectsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-card p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Book className="ml-2 rtl:mr-2 h-5 w-5" />
                  إدارة المواد التعليمية للطالب: {currentStudent?.name}
                </CardTitle>
                <CardDescription>
                  اختر المواد التعليمية التي يمكن للطالب الوصول إليها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedSubjects.length} من أصل {subjects.length} مادة محددة
                  </div>
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <Button variant="outline" size="sm" onClick={handleSelectAllSubjects}>
                      تحديد الكل
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAllSubjects}>
                      إلغاء الكل
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center space-x-2 rtl:space-x-reverse p-3 border rounded-lg">
                      <Checkbox
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => handleSubjectToggle(subject.id)}
                      />
                      <Label 
                        htmlFor={`subject-${subject.id}`}
                        className="flex-1 cursor-pointer flex items-center"
                      >
                        <BookOpen className="ml-2 rtl:mr-2 h-4 w-4 text-green-600" />
                        {subject.name}
                      </Label>
                      <Badge variant={selectedSubjects.includes(subject.id) ? "default" : "secondary"}>
                        {selectedSubjects.includes(subject.id) ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  ))}
                </div>

                {subjects.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookX className="mx-auto h-12 w-12 mb-4" />
                    <p>لا توجد مواد تعليمية مضافة بعد</p>
                    <p className="text-sm">يرجى إضافة المواد التعليمية من إعدادات النظام</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
                <Button variant="outline" onClick={() => setIsSubjectsModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleUpdateSubjects} disabled={isLoading}>
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  <Save className="mr-1 ml-0 rtl:ml-1 rtl:mr-0 h-4 w-4" />
                </Button>
              </CardFooter>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {studentsByStage.map(stage => (
          <div key={stage.id}>
            <h2 className="text-xl font-bold mb-2">{stage.name}</h2>
            {stage.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-md overflow-hidden">
                  <thead className="bg-primary/10">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-right">الاسم</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">البريد الإلكتروني</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">المواد النشطة</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">تحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.students.map(student => (
                      <tr key={student.id} className="hover:bg-primary/20 transition-colors">
                        <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                        <td className="border border-gray-300 px-4 py-2">{student.email}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center">
                              <Badge variant={getActiveSubjectsCount(student) > 0 ? "default" : "secondary"}>
                                <Book className="ml-1 rtl:mr-1 h-3 w-3" />
                                {getActiveSubjectsCount(student)} مادة نشطة
                              </Badge>
                            </div>
                            {student.activeSubjects && student.activeSubjects.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {student.activeSubjects.map(subjectId => getSubjectName(subjectId)).join('، ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => openModalForEdit(student)}>
                            <Edit size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> تعديل
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => openSubjectsModal(student)}
                          >
                            <Settings size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> المواد
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student.id)} disabled={isLoading}>
                            <Trash2 size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> حذف
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لا يوجد طلاب في هذه المرحلة بعد.</p>
            )}
          </div>
        ))}

        {unassignedStudents.length > 0 && (
          <Card className="shadow-lg border-destructive mt-8">
            <CardHeader>
              <CardTitle className="text-xl text-destructive">طلاب غير مسجلين في مرحلة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-md overflow-hidden">
                  <thead className="bg-destructive/10">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-right">الاسم</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">البريد الإلكتروني</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">المواد النشطة</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">تحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedStudents.map(student => (
                      <tr key={student.id} className="hover:bg-destructive/20 transition-colors">
                        <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                        <td className="border border-gray-300 px-4 py-2">{student.email}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center">
                              <Badge variant={getActiveSubjectsCount(student) > 0 ? "default" : "secondary"}>
                                <Book className="ml-1 rtl:mr-1 h-3 w-3" />
                                {getActiveSubjectsCount(student)} مادة نشطة
                              </Badge>
                            </div>
                            {student.activeSubjects && student.activeSubjects.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {student.activeSubjects.map(subjectId => getSubjectName(subjectId)).join('، ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 flex gap-2 justify-center">
                          <Button variant="outline" size="sm" onClick={() => openModalForEdit(student)}>
                            <Edit size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> تعديل
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => openSubjectsModal(student)}
                          >
                            <Settings size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> المواد
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student.id)} disabled={isLoading}>
                            <Trash2 size={14} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> حذف
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ManageStudentsPage;
