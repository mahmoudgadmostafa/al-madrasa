import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";
import { Save } from 'lucide-react';
import { doc, writeBatch } from "firebase/firestore";

const AssignSubjectsModal = ({ isOpen, onClose, teacher, allAssignments, allSubjects, teachers, educationalStages, onSave, db }) => {
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      const teacherAssignmentIds = allAssignments
        .filter(a => a.teacherId === teacher.id)
        .map(a => a.id);
      setSelectedAssignments(teacherAssignmentIds);
    }
  }, [teacher, allAssignments, isOpen]);

  const handleSave = async () => {
    if (!teacher) return;
    setIsLoading(true);
    
    try {
      const batch = writeBatch(db);
      
      const assignmentsInThisModal = allAssignments.map(a => a.id);
      
      for (const assignmentId of assignmentsInThisModal) {
        const assignment = allAssignments.find(a => a.id === assignmentId);
        if (!assignment) continue;

        const isCurrentlySelected = selectedAssignments.includes(assignmentId);
        const wasOriginallyAssignedToThisTeacher = assignment.teacherId === teacher.id;

        if (isCurrentlySelected && !wasOriginallyAssignedToThisTeacher) {
          // Assign it to the current teacher (re-assignment)
          const docRef = doc(db, "subject_assignments", assignmentId);
          batch.update(docRef, { teacherId: teacher.id });
        } else if (!isCurrentlySelected && wasOriginallyAssignedToThisTeacher) {
          // Unassign it from the current teacher
          const docRef = doc(db, "subject_assignments", assignmentId);
          batch.update(docRef, { teacherId: '' });
        }
      }

      await batch.commit();
      
      onSave(teacher, false);
      
      toast({ title: "نجاح", description: "تم تحديث المواد المسندة للمعلم بنجاح." });
      onClose();
    } catch (error) {
      console.error("Error assigning subjects:", error);
      toast({ title: "خطأ", description: `فشل إسناد المواد: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
            className="bg-card p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>إدارة المواد للمعلم: {teacher?.name}</CardTitle>
              <CardDescription>اختر المواد التي سيقوم هذا المعلم بتدريسها. يمكنك إعادة إسناد المواد من معلم لآخر.</CardDescription>
            </CardHeader>
            <CardContent>
              {allAssignments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allAssignments.map(assignment => {
                    const subject = allSubjects.find(s => s.id === assignment.subjectId);
                    const stage = educationalStages.find(st => st.id === assignment.stageId);
                    const assignedTeacher = assignment.teacherId ? teachers.find(t => t.id === assignment.teacherId) : null;
                    const isAssignedToOther = assignedTeacher && assignedTeacher.id !== teacher.id;
                    const isChecked = selectedAssignments.includes(assignment.id);
                    
                    return (
                      <div key={assignment.id} className={`flex flex-col space-y-1 p-3 border rounded-md transition-colors ${isAssignedToOther ? 'border-amber-500 bg-amber-500/10' : 'border-border'}`}>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <input
                            type="checkbox"
                            id={`assign-${assignment.id}`}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssignments([...selectedAssignments, assignment.id]);
                              } else {
                                setSelectedAssignments(selectedAssignments.filter(id => id !== assignment.id));
                              }
                            }}
                            className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary cursor-pointer"
                          />
                          <label htmlFor={`assign-${assignment.id}`} className="text-sm font-medium flex flex-col cursor-pointer">
                            <span>{subject ? subject.name : 'مادة غير معروفة'}</span>
                            <span className="text-xs text-muted-foreground">{stage ? stage.name : 'مرحلة غير معروفة'}</span>
                          </label>
                        </div>
                        {isAssignedToOther && (
                          <p className="text-xs text-amber-600 pl-7 rtl:pr-7">مسندة حالياً لـ: {assignedTeacher.name}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4 border-dashed border-2 rounded-md">
                  لا توجد ارتباطات مواد معرفة في النظام. يرجى إضافتها أولاً من صفحة "إدارة المواد الدراسية".
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                <Save className="mr-1 ml-0 rtl:ml-1 rtl:mr-0 h-4 w-4" />
              </Button>
            </CardFooter>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AssignSubjectsModal;