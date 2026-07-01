import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { BookCopy, PlusCircle, Trash2, Save, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, addDoc, writeBatch, getDoc, query, where } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

const ManageSubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [assignments, setAssignments] = useState([]);

  const db = getFirestore();
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      const subjectsSnapshot = await getDocs(collection(db, "subjects"));
      const fetchedSubjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(fetchedSubjects);

      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      const stages = settingsSnap.exists() ? settingsSnap.data().educationalStages || [] : [];
      setEducationalStages(stages);

      const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
      const teachersSnapshot = await getDocs(teachersQuery);
      const fetchedTeachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(fetchedTeachers);
      
      const assignmentsSnapshot = await getDocs(collection(db, "subject_assignments"));
      const fetchedAssignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(fetchedAssignments);

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

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({ title: "خطأ", description: "اسم المادة مطلوب.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const newSubjectRef = await addDoc(collection(db, "subjects"), { name: newSubjectName });
      setSubjects([...subjects, { id: newSubjectRef.id, name: newSubjectName }]);
      setNewSubjectName('');
      toast({ title: "نجاح", description: "تمت إضافة المادة بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إضافة المادة.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("هل أنت متأكد؟ حذف المادة سيؤدي إلى حذف جميع ارتباطاتها بالمراحل والمعلمين.")) return;
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "subjects", subjectId));
      const assignmentsToDelete = assignments.filter(a => a.subjectId === subjectId);
      assignmentsToDelete.forEach(a => batch.delete(doc(db, "subject_assignments", a.id)));
      await batch.commit();
      
      setSubjects(subjects.filter(s => s.id !== subjectId));
      setAssignments(assignments.filter(a => a.subjectId !== subjectId));
      toast({ title: "نجاح", description: "تم حذف المادة وارتباطاتها." });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف المادة.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAssignment = () => {
    setAssignments([...assignments, { id: `new_${Date.now()}`, subjectId: '', stageId: '', teacherId: '' }]);
  };

  const handleAssignmentChange = (id, field, value) => {
    setAssignments(assignments.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleRemoveAssignment = async (id) => {
    if (id.startsWith('new_')) {
      setAssignments(assignments.filter(a => a.id !== id));
    } else {
      if (!window.confirm("هل أنت متأكد من حذف هذا الربط؟")) return;
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, "subject_assignments", id));
        setAssignments(assignments.filter(a => a.id !== id));
        toast({ title: "نجاح", description: "تم حذف الربط." });
      } catch (error) {
        toast({ title: "خطأ", description: "فشل حذف الربط.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveAssignments = async () => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      for (const assignment of assignments) {
        if (!assignment.subjectId || !assignment.stageId) {
          toast({ title: "بيانات ناقصة", description: `يجب تحديد المادة والمرحلة لكل ربط. المعلم اختياري.`, variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const assignmentData = {
          subjectId: assignment.subjectId,
          stageId: assignment.stageId,
          teacherId: assignment.teacherId || '',
        };
        const docRef = assignment.id.startsWith('new_') 
          ? doc(collection(db, "subject_assignments"))
          : doc(db, "subject_assignments", assignment.id);
        batch.set(docRef, assignmentData, { merge: true });
      }
      await batch.commit();
      toast({ title: "نجاح", description: "تم حفظ ارتباطات المواد بنجاح." });
      fetchInitialData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الارتباطات.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div><p className="ml-4 rtl:mr-4 text-lg text-foreground">جاري تحميل البيانات...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <BookCopy className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">إدارة المواد الدراسية</h1>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
                <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                العودة
            </Button>
        </div>
        <p className="text-muted-foreground">أولاً، قم بإنشاء قائمة بالمواد. ثانياً، قم بربط كل مادة بمرحلة ومعلم (المعلم اختياري).</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>1. قائمة المواد</CardTitle>
            <CardDescription>أضف جميع المواد الدراسية هنا.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="اسم المادة الجديدة" />
              <Button onClick={handleAddSubject} disabled={isLoading}><PlusCircle size={16} /></Button>
            </div>
            <ul className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {subjects.map(s => (
                <li key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <span>{s.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(s.id)} disabled={isLoading} className="text-destructive hover:text-destructive/80">
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>2. ربط المواد بالمراحل والمعلمين</CardTitle>
            <CardDescription>حدد لكل مادة المرحلة التي تدرس فيها والمعلم المسؤول عنها.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-3 border rounded-lg">
                  <Select value={assignment.subjectId} onValueChange={v => handleAssignmentChange(assignment.id, 'subjectId', v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={assignment.stageId} onValueChange={v => handleAssignmentChange(assignment.id, 'stageId', v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                    <SelectContent>{educationalStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={assignment.teacherId} onValueChange={v => handleAssignmentChange(assignment.id, 'teacherId', v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المعلم (اختياري)" /></SelectTrigger>
                    <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="destructive" onClick={() => handleRemoveAssignment(assignment.id)}><Trash2 size={16} /></Button>
                </div>
              ))}
            </div>
            <Button onClick={handleAddAssignment} variant="outline" className="mt-4">
              <LinkIcon className="mr-2 ml-0 h-4 w-4" /> إضافة ربط جديد
            </Button>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveAssignments} disabled={isLoading}>
              <Save className="mr-2 ml-0 h-4 w-4" /> حفظ كل الارتباطات
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ManageSubjectsPage;