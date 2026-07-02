import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { toast } from "@/components/ui/use-toast";
import { Save, X, User, Mail, GraduationCap, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from "firebase/firestore";

/**
 * TeacherFormModal - نافذة تعديل بيانات المعلم المحدّثة
 * تتيح تعديل الاسم واختيار المراحل التعليمية (مع فلترة المحذوفة)
 */
const TeacherFormModal = ({ isOpen, onClose, teacher, educationalStages, onSave, db }) => {
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [assignedStages, setAssignedStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setTeacherName(teacher.name || '');
      setTeacherEmail(teacher.email || '');
      // فلترة المراحل المحذوفة عند فتح النافذة
      const validStages = (teacher.assignedStages || []).filter(stageId =>
        educationalStages.some(s => s.id === stageId)
      );
      setAssignedStages(validStages);
    } else {
      setTeacherName('');
      setTeacherEmail('');
      setAssignedStages([]);
    }
  }, [teacher, isOpen, educationalStages]);

  const toggleStage = (stageId) => {
    setAssignedStages(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const validateForm = () => {
    if (!teacherName.trim()) {
      toast({ title: "خطأ في الإدخال", description: "اسم المعلم مطلوب.", variant: "destructive" });
      return false;
    }
    if (assignedStages.length === 0) {
      toast({ title: "خطأ في الإدخال", description: "يجب تحديد مرحلة تعليمية واحدة على الأقل.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !teacher) return;
    setIsLoading(true);

    const teacherDataPayload = { name: teacherName, assignedStages };

    try {
      await updateDoc(doc(db, "users", teacher.id), teacherDataPayload);
      onSave({ ...teacher, ...teacherDataPayload }, false);
      toast({ title: "✅ تم التحديث", description: "تم تحديث بيانات المعلم بنجاح." });
      onClose();
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast({ title: "خطأ", description: `فشل تحديث بيانات المعلم: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const initials = (teacher?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const stageColors = ['#8b5cf6', '#6366f1', '#a855f7', '#7c3aed', '#4f46e5'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #2d1b69 50%, #1e1b4b 100%)',
              border: '1px solid rgba(139,92,246,0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-purple-500/20 flex items-center gap-4" style={{ background: 'rgba(139,92,246,0.12)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-lg">تعديل بيانات المعلم</h2>
                <p className="text-purple-300 text-xs mt-0.5 truncate">{teacher?.email}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:bg-white/10 hover:text-white transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Teacher Name */}
              <div className="space-y-2">
                <Label className="text-purple-200 text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" /> اسم المعلم
                </Label>
                <input
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="الاسم الكامل للمعلم"
                  className="w-full px-4 py-3 rounded-xl border border-purple-500/30 text-white placeholder-purple-400/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label className="text-purple-200 text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> البريد الإلكتروني
                  <span className="text-xs text-purple-500 font-normal">(للقراءة فقط)</span>
                </Label>
                <div className="w-full px-4 py-3 rounded-xl border border-purple-500/15 text-purple-300 text-sm" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {teacherEmail || '—'}
                </div>
              </div>

              {/* Educational Stages */}
              <div className="space-y-3">
                <Label className="text-purple-200 text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> المراحل التعليمية المسندة
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(139,92,246,0.25)', color: '#c084fc' }}>
                    {assignedStages.length} محددة
                  </span>
                </Label>

                {educationalStages.length === 0 ? (
                  <div className="p-4 rounded-xl text-center border border-dashed border-purple-500/20" style={{ background: 'rgba(139,92,246,0.05)' }}>
                    <GraduationCap className="w-8 h-8 text-purple-400/30 mx-auto mb-2" />
                    <p className="text-purple-400/60 text-sm">لا توجد مراحل تعليمية معرفة</p>
                    <p className="text-purple-500/40 text-xs mt-1">يرجى إضافتها من إعدادات النظام</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {educationalStages.map((stage, index) => {
                      const isSelected = assignedStages.includes(stage.id);
                      const color = stageColors[index % stageColors.length];
                      return (
                        <button
                          key={stage.id}
                          onClick={() => toggleStage(stage.id)}
                          className="flex items-center gap-3 p-3 rounded-xl border text-right transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: isSelected ? `${color}20` : 'rgba(255,255,255,0.04)',
                            borderColor: isSelected ? `${color}60` : 'rgba(139,92,246,0.15)',
                          }}
                        >
                          {/* Custom Checkbox */}
                          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all duration-150"
                            style={{
                              background: isSelected ? color : 'transparent',
                              borderColor: isSelected ? color : 'rgba(139,92,246,0.35)',
                            }}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className="text-sm font-medium flex-1" style={{ color: isSelected ? '#e9d5ff' : '#a78bfa' }}>
                            {stage.name}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-5 border-t border-purple-500/20 flex gap-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white transition-all duration-150 text-sm font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !teacherName.trim()}
                className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: isLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    حفظ التعديلات
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeacherFormModal;