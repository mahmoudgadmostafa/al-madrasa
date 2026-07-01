import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";

const TeacherCard = ({ teacher, educationalStages, onEdit, onDelete, setIsLoadingParent, isLoadingParent, db }) => {
  
  const handleDelete = async () => {
    if (!window.confirm("هل أنت متأكد أنك تريد حذف هذا المعلم؟ سيتم حذف بياناته من قاعدة البيانات فقط. يجب حذف حساب المصادقة الخاص به يدوياً من Firebase Console لمنعه من تسجيل الدخول.")) return;
    setIsLoadingParent(true);
    try {
      await deleteDoc(doc(db, "users", teacher.id));
      onDelete(teacher.id);
      toast({ title: "نجاح", description: "تم حذف بيانات المعلم. لا تنسَ حذف حساب المصادقة يدوياً.", duration: 7000 });
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast({ title: "خطأ", description: "فشل حذف المعلم.", variant: "destructive" });
    } finally {
      setIsLoadingParent(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
        <CardHeader>
          <CardTitle>{teacher.name}</CardTitle>
          <CardDescription>{teacher.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">المراحل المسندة (للتدريس):</p>
            {teacher.assignedStages && teacher.assignedStages.length > 0 ? (
              <ul className="list-disc list-inside rtl:list-outside rtl:pr-4 text-sm">
                {teacher.assignedStages.map(stageId => {
                  const stage = educationalStages.find(s => s.id === stageId);
                  return <li key={stageId}>{stage ? stage.name : 'مرحلة غير معروفة'}</li>;
                })}
              </ul>
            ) : <p className="text-sm text-muted-foreground">لا يوجد مراحل مسندة.</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end items-center border-t pt-4 mt-auto">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit size={16} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> تعديل البيانات
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isLoadingParent}>
              <Trash2 size={16} className="mr-1 ml-0 rtl:ml-1 rtl:mr-0" /> حذف
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default TeacherCard;