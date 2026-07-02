import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";
import { UserPlus, ArrowLeft, BookCopy, Users, Search, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, query, where, getDoc, onSnapshot } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import TeacherFormModal from '@/components/admin/TeacherFormModal';
import TeacherCard from '@/components/admin/TeacherCard';
import AddUserModal from '@/components/admin/AddUserModal';

const ManageTeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const openEditModal = (teacher) => { setCurrentTeacher(teacher); setIsEditModalOpen(true); };

  const handleUserSaved = (savedUser, isNew) => {
    if (isNew && savedUser.role === 'teacher') setTeachers(prev => [...prev, savedUser]);
    else if (!isNew) setTeachers(prev => prev.map(t => (t.id === savedUser.id ? savedUser : t)));
    fetchInitialData();
  };

  const handleTeacherDeleted = (deletedTeacherId) => setTeachers(prev => prev.filter(t => t.id !== deletedTeacherId));

  const filteredTeachers = teachers.filter(t =>
    !searchQuery || t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2d1b69 30%, #1e3a5f 60%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">جاري تحميل بيانات المعلمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2d1b69 30%, #1e3a5f 60%, #0f172a 100%)' }}>
      {/* Mesh gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}></div>
        <div className="absolute top-1/3 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}></div>
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">إدارة المعلمين</h1>
                <p className="text-purple-300 text-sm mt-1">{teachers.length} معلم مسجل في النظام</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-purple-200 border border-purple-500/30 hover:bg-purple-500/10 transition-all duration-200 self-start sm:self-auto">
              <ArrowLeft className="w-4 h-4" /> العودة للوحة التحكم
            </button>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'إجمالي المعلمين', value: teachers.length, icon: Users, color: 'purple' },
            { label: 'المراحل الدراسية', value: educationalStages.length, icon: BookCopy, color: 'indigo' },
            { label: 'نتائج البحث', value: filteredTeachers.length, icon: Search, color: 'violet' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 border border-purple-500/20 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `rgba(139,92,246,0.2)` }}>
                <stat.icon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">{stat.value}</p>
                <p className="text-purple-300 text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Action Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-purple-500/30 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}
            />
          </div>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            <UserPlus className="w-5 h-5" /> إنشاء حساب معلم
          </button>
          <button
            onClick={() => navigate('/admin/curriculum')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-purple-500/30 text-purple-200 hover:bg-purple-500/10 transition-all duration-200 whitespace-nowrap"
          >
            <BookCopy className="w-5 h-5" /> إدارة المناهج
          </button>
        </motion.div>

        {/* Modals */}
        <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} onSave={handleUserSaved} db={db} defaultRole="teacher" educationalStages={educationalStages} />
        <TeacherFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} teacher={currentTeacher} educationalStages={educationalStages} onSave={handleUserSaved} db={db} />

        {/* Teachers Grid */}
        {filteredTeachers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Users className="w-10 h-10 text-purple-400" />
            </div>
            <p className="text-purple-200 text-xl font-semibold mb-2">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد معلمون مضافون'}
            </p>
            <p className="text-purple-400 text-sm">
              {searchQuery ? 'جرب كلمات بحث مختلفة' : 'ابدأ بإنشاء حساب معلم جديد'}
            </p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTeachers.map((teacher, index) => (
                <motion.div key={teacher.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.05 }}>
                  <TeacherCard
                    teacher={teacher}
                    educationalStages={educationalStages}
                    onEdit={() => openEditModal(teacher)}
                    onDelete={handleTeacherDeleted}
                    setIsLoadingParent={setIsLoading}
                    isLoadingParent={isLoading}
                    db={db}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ManageTeachersPage;