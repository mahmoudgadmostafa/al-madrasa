import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, BookOpen, GraduationCap, Book, ChevronDown, ChevronUp, User, Mail, BookCopy } from 'lucide-react';
import { doc, deleteDoc, getDoc, onSnapshot } from "firebase/firestore";

/**
 * TeacherCard - بطاقة معلم محدَّثة تعرض:
 * - المراحل المسندة للمعلم
 * - المواد المسندة له من مجموعة curriculum (مزامنة فورية)
 * وتتجاهل المراحل/المواد التي حذفها المدير من إعدادات النظام
 */
const TeacherCard = ({ teacher, educationalStages, onEdit, onDelete, setIsLoadingParent, isLoadingParent, db }) => {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // جلب مواد المعلم بشكل فوري من curriculum باستخدام onSnapshot
  useEffect(() => {
    if (!teacher || !educationalStages || educationalStages.length === 0) {
      setAssignedSubjects([]);
      setIsLoadingSubjects(false);
      return;
    }

    const teacherStages = (teacher.assignedStages || []).filter(stageId =>
      educationalStages.some(s => s.id === stageId)
    );

    if (teacherStages.length === 0) {
      setAssignedSubjects([]);
      setIsLoadingSubjects(false);
      return;
    }

    setIsLoadingSubjects(true);
    const unsubscribes = [];
    const subjectsByStage = {};

    let loadedCount = 0;

    teacherStages.forEach(stageId => {
      const curriculumRef = doc(db, "curriculum", stageId);
      const unsub = onSnapshot(curriculumRef, (snap) => {
        const data = snap.exists() ? snap.data() : {};
        const subjects = [];

        ['semesterOneSubjects', 'semesterTwoSubjects'].forEach(semester => {
          (data[semester] || []).forEach(subject => {
            if (subject && subject.teacherId === teacher.id) {
              subjects.push({
                id: subject.id,
                name: subject.name,
                stageId,
                stageName: educationalStages.find(s => s.id === stageId)?.name || '',
                semester: semester === 'semesterOneSubjects' ? 'الفصل الأول' : 'الفصل الثاني',
              });
            }
          });
        });

        subjectsByStage[stageId] = subjects;
        loadedCount++;
        if (loadedCount >= teacherStages.length) setIsLoadingSubjects(false);

        // دمج كل المواد من جميع المراحل
        setAssignedSubjects(Object.values(subjectsByStage).flat());
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [teacher, educationalStages, db]);

  const handleDelete = async () => {
    if (!window.confirm(
      "هل أنت متأكد أنك تريد حذف هذا المعلم؟\nسيتم حذف بياناته من قاعدة البيانات. يجب حذف حساب المصادقة يدوياً من Firebase Console."
    )) return;

    setIsLoadingParent(true);
    try {
      await deleteDoc(doc(db, "users", teacher.id));
      onDelete(teacher.id);
      toast({ title: "تم الحذف", description: "تم حذف بيانات المعلم. لا تنسَ حذف حساب المصادقة يدوياً.", duration: 7000 });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({ title: "خطأ", description: "فشل حذف المعلم.", variant: "destructive" });
    } finally {
      setIsLoadingParent(false);
    }
  };

  // المراحل الفعلية المسندة (بعد فلترة المحذوفة من المدير)
  const validStages = (teacher.assignedStages || [])
    .map(stageId => educationalStages.find(s => s.id === stageId))
    .filter(Boolean);

  // أول حرف من اسم المعلم لعرضه في الأفاتار
  const initials = (teacher.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const stageColors = ['#8b5cf6', '#6366f1', '#a855f7', '#7c3aed', '#4f46e5'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-purple-500/20 overflow-hidden flex flex-col h-full transition-all duration-200 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
      style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
    >
      {/* Card Header */}
      <div className="p-5 border-b border-purple-500/15" style={{ background: 'rgba(139,92,246,0.1)' }}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base leading-tight truncate">{teacher.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Mail className="w-3 h-3 text-purple-400 shrink-0" />
              <p className="text-purple-300 text-xs truncate">{teacher.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-purple-300 text-xs font-semibold uppercase tracking-wide">المراحل المسندة</span>
        </div>

        {validStages.length === 0 ? (
          <p className="text-purple-400/50 text-xs italic">لا توجد مراحل مسندة</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {validStages.map((stage, i) => (
              <span key={stage.id} className="px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: `${stageColors[i % stageColors.length]}30`, border: `1px solid ${stageColors[i % stageColors.length]}50`, color: stageColors[i % stageColors.length] }}>
                {stage.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subjects */}
      <div className="px-5 pb-4 flex-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2 border-t border-purple-500/15 group"
        >
          <div className="flex items-center gap-2">
            <Book className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-semibold uppercase tracking-wide">المواد المسندة</span>
            {!isLoadingSubjects && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc' }}>
                {assignedSubjects.length}
              </span>
            )}
          </div>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-purple-400 group-hover:text-purple-200 transition-colors" />
            : <ChevronDown className="w-4 h-4 text-purple-400 group-hover:text-purple-200 transition-colors" />
          }
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {isLoadingSubjects ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-purple-300 text-xs">جاري التحميل...</span>
                </div>
              ) : assignedSubjects.length === 0 ? (
                <div className="py-3 text-center">
                  <BookCopy className="w-8 h-8 text-purple-400/30 mx-auto mb-1" />
                  <p className="text-purple-400/50 text-xs">لا توجد مواد مسندة لهذا المعلم</p>
                  <p className="text-purple-400/30 text-xs mt-0.5">يمكن إسناد المواد من صفحة إدارة المناهج</p>
                </div>
              ) : (
                <div className="space-y-1.5 pt-2 pb-1 max-h-48 overflow-y-auto">
                  {assignedSubjects.map((subject, i) => (
                    <div key={`${subject.id}-${i}`} className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stageColors[educationalStages.findIndex(s => s.id === subject.stageId) % stageColors.length] || '#8b5cf6' }}></div>
                        <span className="text-white text-xs font-medium truncate">{subject.name}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0 mr-2">
                        <span className="text-purple-400 text-xs">{subject.stageName}</span>
                        <span className="text-purple-500 text-xs">{subject.semester}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Footer */}
      <div className="px-5 py-4 border-t border-purple-500/15 flex gap-2" style={{ background: 'rgba(0,0,0,0.1)' }}>
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-purple-200 border border-purple-500/30 hover:bg-purple-500/15 hover:text-white transition-all duration-150"
        >
          <Edit className="w-3.5 h-3.5" />
          تعديل البيانات
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoadingParent}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-300 border border-red-500/25 hover:bg-red-500/15 hover:text-red-200 transition-all duration-150 disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>
      </div>
    </motion.div>
  );
};

export default TeacherCard;