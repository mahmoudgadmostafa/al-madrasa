import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Settings, PlusCircle, Trash2, Save, ArrowLeft, Globe, GraduationCap, Calendar, Building2, Mail } from 'lucide-react';
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

  const formatEmailDomain = (domain) => {
    if (!domain) return '';
    let cleanedDomain = domain.trim();
    if (cleanedDomain.startsWith('@')) cleanedDomain = cleanedDomain.substring(1);
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
              ? data.educationalStages.map(stage => ({ ...initializeStage(), ...stage, id: String(stage.id) }))
              : [initializeStage()]
          );
        } else {
          setEducationalStages([initializeStage()]);
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
        toast({ title: "خطأ", description: "لم نتمكن من تحميل إعدادات النظام.", variant: "destructive" });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [db, user]);

  const handleAddStage = () => setEducationalStages([...educationalStages, initializeStage()]);
  const handleRemoveStage = (id) => setEducationalStages(educationalStages.filter(stage => stage.id !== id));

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

  const handleEmailDomainChange = (value) => {
    let cleanedValue = value;
    if (cleanedValue.startsWith('@')) cleanedValue = cleanedValue.substring(1);
    setEmailDomain(cleanedValue);
  };

  const isValidDomain = (domain) => {
    if (!domain) return true;
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    if (!schoolName.trim() || !academicYear.trim() || educationalStages.some(stage => !stage.name.trim())) {
      toast({ title: "خطأ في الإدخال", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: "destructive" });
      return;
    }
    const cleanedEmailDomain = formatEmailDomain(emailDomain);
    if (cleanedEmailDomain && !isValidDomain(cleanedEmailDomain)) {
      toast({ title: "خطأ في الإدخال", description: "الرجاء إدخال نطاق بريد إلكتروني صحيح (مثال: school.edu).", variant: "destructive" });
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
      updateSchoolSettings({ schoolName, educationalStages: settingsData.educationalStages, academicYear: settingsData.academicYear, emailDomain: settingsData.emailDomain });
      toast({ title: "✅ تم الحفظ بنجاح!", description: "تم حفظ إعدادات النظام بنجاح." });
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast({ title: "خطأ", description: "لم نتمكن من حفظ الإعدادات.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #1e3a5f 60%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200 text-lg">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #1e3a5f 60%, #0f172a 100%)' }}>
      {/* Mesh gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">إعدادات النظام</h1>
                <p className="text-blue-300 text-sm mt-1">تكوين الإعدادات الأساسية للنظام المدرسي</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-blue-200 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200 self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              العودة للوحة التحكم
            </button>
          </div>
        </motion.div>

        {/* General Settings Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-6">
          <div className="rounded-2xl border border-blue-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
            <div className="px-6 py-4 border-b border-blue-500/20" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">الإعدادات العامة</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-blue-200 flex items-center gap-2 text-sm font-medium">
                    <Building2 className="w-4 h-4" /> اسم المدرسة
                  </Label>
                  <input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="أدخل اسم المدرسة"
                    className="w-full px-4 py-3 rounded-xl border border-blue-500/30 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-200 flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" /> السنة الدراسية
                  </Label>
                  <input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="مثال: 2024-2025"
                    className="w-full px-4 py-3 rounded-xl border border-blue-500/30 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-blue-200 flex items-center gap-2 text-sm font-medium">
                    <Mail className="w-4 h-4" /> نطاق البريد الإلكتروني
                  </Label>
                  <input
                    value={emailDomain}
                    onChange={(e) => handleEmailDomainChange(e.target.value)}
                    placeholder="school.edu"
                    className="w-full px-4 py-3 rounded-xl border border-blue-500/30 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  />
                  {emailDomain && (
                    <p className="text-xs text-blue-300 mt-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      مثال: user@{emailDomain}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Educational Stages Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="rounded-2xl border border-blue-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
            <div className="px-6 py-4 border-b border-blue-500/20" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">المراحل التعليمية</h2>
                  <p className="text-blue-300 text-xs mt-0.5">إدارة المراحل وتحديد نظام وتواريخ الدراسة</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <AnimatePresence>
                {educationalStages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl border border-blue-500/20 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    {/* Stage Header */}
                    <div className="px-4 py-3 border-b border-blue-500/10 flex items-center justify-between" style={{ background: 'rgba(59,130,246,0.08)' }}>
                      <span className="text-blue-300 text-sm font-medium">المرحلة {index + 1}</span>
                      {educationalStages.length > 1 && (
                        <button
                          onClick={() => handleRemoveStage(stage.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-sm">اسم المرحلة</Label>
                          <input
                            placeholder={`اسم المرحلة ${index + 1}`}
                            value={stage.name}
                            onChange={(e) => handleStageChange(stage.id, 'name', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-blue-500/30 text-white placeholder-blue-400/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 text-sm transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.07)' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-200 text-sm">نظام الدراسة</Label>
                          <Select value={stage.semesterSystem} onValueChange={(v) => handleStageChange(stage.id, 'semesterSystem', v)}>
                            <SelectTrigger className="border-blue-500/30 text-white focus:ring-blue-400/20" style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="one-semester">فصل دراسي واحد</SelectItem>
                              <SelectItem value="two-semesters">فصلين دراسيين</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {stage.semesterSystem === 'one-semester' && (
                        <div className="p-3 rounded-lg border border-blue-500/15" style={{ background: 'rgba(59,130,246,0.06)' }}>
                          <p className="text-blue-300 text-sm font-medium mb-3">الفصل الدراسي</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-blue-300 text-xs">من تاريخ</Label>
                              <input type="date" value={stage.semesterOne.from} onChange={e => handleStageChange(stage.id, 'semesterOne.from', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-blue-300 text-xs">إلى تاريخ</Label>
                              <input type="date" value={stage.semesterOne.to} onChange={e => handleStageChange(stage.id, 'semesterOne.to', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {stage.semesterSystem === 'two-semesters' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg border border-blue-500/15 space-y-3" style={{ background: 'rgba(59,130,246,0.06)' }}>
                            <p className="text-blue-300 text-sm font-medium">الفصل الأول</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-blue-300 text-xs">من</Label>
                                <input type="date" value={stage.semesterOne.from} onChange={e => handleStageChange(stage.id, 'semesterOne.from', e.target.value)}
                                  className="w-full px-2 py-2 rounded-lg border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-blue-300 text-xs">إلى</Label>
                                <input type="date" value={stage.semesterOne.to} onChange={e => handleStageChange(stage.id, 'semesterOne.to', e.target.value)}
                                  className="w-full px-2 py-2 rounded-lg border border-blue-500/30 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border border-indigo-500/15 space-y-3" style={{ background: 'rgba(99,102,241,0.06)' }}>
                            <p className="text-indigo-300 text-sm font-medium">الفصل الثاني</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-indigo-300 text-xs">من</Label>
                                <input type="date" value={stage.semesterTwo.from} onChange={e => handleStageChange(stage.id, 'semesterTwo.from', e.target.value)}
                                  className="w-full px-2 py-2 rounded-lg border border-indigo-500/30 text-white text-sm focus:outline-none focus:border-indigo-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-indigo-300 text-xs">إلى</Label>
                                <input type="date" value={stage.semesterTwo.to} onChange={e => handleStageChange(stage.id, 'semesterTwo.to', e.target.value)}
                                  className="w-full px-2 py-2 rounded-lg border border-indigo-500/30 text-white text-sm focus:outline-none focus:border-indigo-400 transition-colors duration-200" style={{ background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <button
                onClick={handleAddStage}
                className="w-full py-3 rounded-xl border-2 border-dashed border-blue-500/30 text-blue-300 hover:border-blue-400 hover:text-blue-200 hover:bg-blue-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                إضافة مرحلة تعليمية جديدة
              </button>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={isLoading || isFetching}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-base shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: isLoading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>حفظ جميع الإعدادات</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;