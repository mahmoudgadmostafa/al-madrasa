import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Settings, PlusCircle, Trash2, Save, ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SystemSettingsPage = () => {
  const [schoolName, setSchoolName] = useState(' ');
  const [academicYear, setAcademicYear] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [educationalStages, setEducationalStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const db = getFirestore();
  const { user, updateSchoolSettings } = useAuth();
  const navigate = useNavigate();

  const settingsDocId = "school_system_settings"; 

  const initializeStage = () => ({
    id: String(Date.now()),
    name: '',
    semesterSystem: 'two-semesters',
    semesterOne: { from: '', to: '' },
    semesterTwo: { from: '', to: '' },
  });

  // دالة لتنظيف ومعالجة النطاق
  const formatEmailDomain = (domain) => {
    if (!domain) return '';
    
    // إزالة المسافات من البداية والنهاية
    let cleanedDomain = domain.trim();
    
    // إزالة علامة @ إذا كانت في البداية
    if (cleanedDomain.startsWith('@')) {
      cleanedDomain = cleanedDomain.substring(1);
    }
    
    // إزالة أي علامات @ إضافية قد تكون في النص
    cleanedDomain = cleanedDomain.replace(/@/g, '');
    
    return cleanedDomain.toLowerCase();
  };

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setIsFetching(true);
      try {
        const settingsRef = doc(db, "system_config", settingsDocId);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchoolName(data.schoolName || ' ');
          setAcademicYear(data.academicYear || '');
          setEmailDomain(data.emailDomain || '');
          setEducationalStages(
            data.educationalStages && data.educationalStages.length > 0 
            ? data.educationalStages.map(stage => ({
                ...initializeStage(),
                ...stage,
                id: String(stage.id),
              }))
            : [initializeStage()]
          );
        } else {
           setEducationalStages([initializeStage()]);
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
        toast({
          title: "خطأ",
          description: "لم نتمكن من تحميل إعدادات النظام.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [db, user]);


  const handleAddStage = () => {
    setEducationalStages([...educationalStages, initializeStage()]);
  };

  const handleRemoveStage = (id) => {
    setEducationalStages(educationalStages.filter(stage => stage.id !== id));
  };

  const handleStageChange = (id, field, value) => {
    setEducationalStages(educationalStages.map(stage => {
      if (stage.id === id) {
        if (field.startsWith('semesterOne.') || field.startsWith('semesterTwo.')) {
          const [semester, key] = field.split('.');
          return { ...stage, [semester]: { ...stage[semester], [key]: value } };
        }
        return { ...stage, [field]: value };
      }
      return stage;
    }));
  };

  // معالجة تغيير نطاق البريد الإلكتروني
  const handleEmailDomainChange = (value) => {
    // إزالة @ تلقائياً إذا أدخلها المستخدم
    let cleanedValue = value;
    if (cleanedValue.startsWith('@')) {
      cleanedValue = cleanedValue.substring(1);
    }
    setEmailDomain(cleanedValue);
  };

  // دالة للتحقق من صحة النطاق
  const isValidDomain = (domain) => {
    if (!domain) return true; // النطاق اختياري
    
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    if (!schoolName.trim() || !academicYear.trim() || educationalStages.some(stage => !stage.name.trim())) {
      toast({ title: "خطأ في الإدخال", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: "destructive" });
      return;
    }

    // تنظيف النطاق قبل الحفظ
    const cleanedEmailDomain = formatEmailDomain(emailDomain);

    // التحقق من صيغة نطاق البريد الإلكتروني (إذا تم إدخاله)
    if (cleanedEmailDomain && !isValidDomain(cleanedEmailDomain)) {
      toast({ 
        title: "خطأ في الإدخال", 
        description: "الرجاء إدخال نطاق بريد إلكتروني صحيح (مثال: school.edu).", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const settingsData = {
        schoolName,
        academicYear,
        emailDomain: cleanedEmailDomain,
        educationalStages: educationalStages.map(({ id, name, semesterSystem, semesterOne, semesterTwo }) => ({
          id: String(id), name, semesterSystem, semesterOne, semesterTwo
        })),
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      };
      
      const settingsRef = doc(db, "system_config", settingsDocId);
      await setDoc(settingsRef, settingsData, { merge: true });
      
      updateSchoolSettings({ 
        schoolName, 
        educationalStages: settingsData.educationalStages, 
        academicYear: settingsData.academicYear,
        emailDomain: settingsData.emailDomain
      });

      toast({ title: "نجاح!", description: "تم حفظ إعدادات النظام بنجاح." });
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast({ title: "خطأ", description: "لم نتمكن من حفظ الإعدادات.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePromoteStudents = () => {
    toast({ title: "🚧 ميزة قيد التطوير", description: "ترحيل الطلاب سيكون متاحاً قريباً!" });
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <Settings className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">إعدادات النظام</h1>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin')}>
                <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                العودة إلى لوحة التحكم
            </Button>
        </div>
        <p className="text-muted-foreground">قم بتكوين الإعدادات الأساسية للنظام المدرسي.</p>
      </motion.div>

      <Card className="shadow-xl mb-8">
        <CardHeader>
          <CardTitle>الإعدادات العامة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="schoolName" className="text-base">اسم المدرسة</Label>
            <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="academicYear" className="text-base">السنة الدراسية</Label>
            <Input id="academicYear" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="mt-1" />
          </div>
          {/* الحقل الجديد لنطاق البريد الإلكتروني */}
          <div className="md:col-span-2">
            <Label htmlFor="emailDomain" className="text-base">نطاق البريد الإلكتروني للمدرسة</Label>
            <Input 
              id="emailDomain" 
              value={emailDomain} 
              onChange={(e) => handleEmailDomainChange(e.target.value)} 
              className="mt-1" 
              placeholder="school.edu"
            />
            <p className="text-sm text-muted-foreground mt-1">
              سيتم استخدام هذا النطاق للتحقق من عناوين البريد الإلكتروني للمستخدمين في النظام.
              {emailDomain && (
                <span className="text-primary font-medium mr-1">
                  مثال: user@{emailDomain || 'school.edu'}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>المراحل التعليمية</CardTitle>
          <CardDescription>إدارة المراحل وتحديد نظام وتواريخ الدراسة لكل مرحلة.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {educationalStages.map((stage, index) => (
              <motion.div key={stage.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
                  <Input placeholder={`اسم المرحلة ${index + 1}`} value={stage.name} onChange={(e) => handleStageChange(stage.id, 'name', e.target.value)} className="flex-grow" />
                  {educationalStages.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(stage.id)} className="text-destructive"><Trash2 size={18} /></Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>نظام الدراسة</Label>
                        <Select value={stage.semesterSystem} onValueChange={(v) => handleStageChange(stage.id, 'semesterSystem', v)}>
                            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one-semester">فصل دراسي واحد</SelectItem>
                              <SelectItem value="two-semesters">فصلين دراسيين</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                      {stage.semesterSystem === 'one-semester' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>من تاريخ</Label><Input type="date" value={stage.semesterOne.from} onChange={e => handleStageChange(stage.id, 'semesterOne.from', e.target.value)} /></div>
                          <div><Label>إلى تاريخ</Label><Input type="date" value={stage.semesterOne.to} onChange={e => handleStageChange(stage.id, 'semesterOne.to', e.target.value)} /></div>
                        </div>
                      )}
                      {stage.semesterSystem === 'two-semesters' && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">الفصل الدراسي الأول</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label>من</Label><Input type="date" value={stage.semesterOne.from} onChange={e => handleStageChange(stage.id, 'semesterOne.from', e.target.value)} /></div>
                            <div><Label>إلى</Label><Input type="date" value={stage.semesterOne.to} onChange={e => handleStageChange(stage.id, 'semesterOne.to', e.target.value)} /></div>
                          </div>
                          <p className="text-sm font-medium pt-2">الفصل الدراسي الثاني</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label>من</Label><Input type="date" value={stage.semesterTwo.from} onChange={e => handleStageChange(stage.id, 'semesterTwo.from', e.target.value)} /></div>
                            <div><Label>إلى</Label><Input type="date" value={stage.semesterTwo.to} onChange={e => handleStageChange(stage.id, 'semesterTwo.to', e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button onClick={handleAddStage} variant="outline" className="mt-4">
            <PlusCircle className="mr-2 ml-0 h-5 w-5" /> إضافة مرحلة
          </Button>
        </CardContent>
      </Card>
      
      <CardFooter className="mt-8 flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isLoading || isFetching} size="lg">
          {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground mr-2 ml-0"></div> : <Save className="mr-2 ml-0 h-5 w-5" />}
          {isLoading ? 'جاري الحفظ...' : 'حفظ كل الإعدادات'}
        </Button>
      </CardFooter>
    </div>
  );
};

export default SystemSettingsPage;