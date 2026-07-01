import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";
import { UserPlus, ArrowLeft, BookCopy } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, query, where, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import TeacherFormModal from '@/components/admin/TeacherFormModal';
import TeacherCard from '@/components/admin/TeacherCard';
import AddUserModal from '@/components/admin/AddUserModal';

const ManageTeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [currentTeacher, setCurrentTeacher] = useState(null);

  const db = getFirestore();
  const navigate = useNavigate();

  const fetchInitialData = useCallback(async () => {
    setIsFetching(true);
    try {
      const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
      const teachersSnapshot = await getDocs(teachersQuery);
      const fetchedTeachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(fetchedTeachers);

      const settingsRef = doc(db, "system_config", "school_system_settings");
      const settingsSnap = await getDoc(settingsRef);
      const stages = settingsSnap.exists() ? settingsSnap.data().educationalStages || [] : [];
      setEducationalStages(stages);
      
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

  const openEditModal = (teacher) => {
    setCurrentTeacher(teacher);
    setIsEditModalOpen(true);
  };

  const handleUserSaved = (savedUser, isNew) => {
    if (isNew && savedUser.role === 'teacher') {
      setTeachers(prev => [...prev, savedUser]);
    } else if (!isNew) {
      setTeachers(prev => prev.map(t => (t.id === savedUser.id ? savedUser : t)));
    }
    fetchInitialData();
  };
  
  const handleTeacherDeleted = (deletedTeacherId) => {
    setTeachers(prev => prev.filter(t => t.id !== deletedTeacherId));
  };

  if (isFetching) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div><p className="ml-4 rtl:mr-4 text-lg text-foreground">جاري تحميل بيانات المعلمين...</p></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <UserPlus className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">إدارة المعلمين</h1>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
                <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                العودة إلى لوحة التحكم
            </Button>
        </div>
        <p className="text-muted-foreground">إنشاء حسابات للمعلمين وتعديل بياناتهم الأساسية.</p>
      </motion.div>

      <div className="flex space-x-4 rtl:space-x-reverse mb-6">
        <Button onClick={() => setIsAddUserModalOpen(true)}>
          <UserPlus className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-5 w-5" />
          إنشاء حساب معلم
        </Button>
         <Button variant="secondary" onClick={() => navigate('/admin/curriculum')}>
            <BookCopy className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-5 w-5" />
            إدارة المناهج الدراسية
        </Button>
      </div>

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={handleUserSaved}
        db={db}
        defaultRole="teacher"
        educationalStages={educationalStages}
      />

      <TeacherFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        teacher={currentTeacher}
        educationalStages={educationalStages}
        onSave={handleUserSaved}
        db={db}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map(teacher => (
          <TeacherCard 
            key={teacher.id} 
            teacher={teacher} 
            educationalStages={educationalStages}
            onEdit={() => openEditModal(teacher)}
            onDelete={handleTeacherDeleted} 
            setIsLoadingParent={setIsLoading}
            isLoadingParent={isLoading}
            db={db}
          />
        ))}
      </div>
      {teachers.length === 0 && !isFetching && (
        <p className="text-center text-muted-foreground mt-8">لا يوجد معلمون مضافون حالياً.</p>
      )}
    </div>
  );
};

export default ManageTeachersPage;