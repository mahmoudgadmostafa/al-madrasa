import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "@/components/ui/use-toast";
import { Save } from 'lucide-react';
import { doc, updateDoc } from "firebase/firestore";

const TeacherFormModal = ({ isOpen, onClose, teacher, educationalStages, onSave, db }) => {
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [assignedStages, setAssignedStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (teacher) {
      setTeacherName(teacher.name || '');
      setTeacherEmail(teacher.email || '');
      setAssignedStages(teacher.assignedStages || []);
    } else {
      setTeacherName('');
      setTeacherEmail('');
      setAssignedStages([]);
    }
  }, [teacher, isOpen]);

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
    const teacherDataPayload = {
      name: teacherName,
      assignedStages,
    };

    try {
      const teacherDocRef = doc(db, "users", teacher.id);
      await updateDoc(teacherDocRef, teacherDataPayload);
      
      const updatedTeacherData = { ...teacher, ...teacherDataPayload };
      onSave(updatedTeacherData, false);
      
      toast({ title: "نجاح", description: "تم تحديث بيانات المعلم بنجاح." });
      onClose();
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast({ title: "خطأ", description: `فشل تحديث بيانات المعلم: ${error.message}`, variant: "destructive" });
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
            className="bg-card p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>تعديل بيانات المعلم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="teacherName">اسم المعلم</Label>
                <Input id="teacherName" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="teacherEmail">البريد الإلكتروني (للدخول)</Label>
                <Input id="teacherEmail" type="email" value={teacherEmail} disabled />
              </div>
              <div>
                <Label>المراحل التعليمية المسندة</Label>
                {educationalStages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                    {educationalStages.map(stage => (
                      <div key={stage.id} className="flex items-center space-x-2 rtl:space-x-reverse p-2 border rounded-md bg-background/50">
                        <input
                          type="checkbox"
                          id={`stage-edit-${stage.id}`}
                          checked={assignedStages.includes(stage.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedStages([...assignedStages, stage.id]);
                            } else {
                              setAssignedStages(assignedStages.filter(sId => sId !== stage.id));
                            }
                          }}
                          className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                        />
                        <Label htmlFor={`stage-edit-${stage.id}`} className="text-sm font-normal">{stage.name}</Label>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">لا توجد مراحل تعليمية معرفة. يرجى إضافتها من إعدادات النظام.</p>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                <Save className="mr-1 ml-0 rtl:ml-1 rtl:mr-0 h-4 w-4" />
              </Button>
            </CardFooter>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeacherFormModal;