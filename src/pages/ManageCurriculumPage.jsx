import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { BookCopy, PlusCircle, Trash2, Save, ArrowLeft, FilePlus, Book, Film, FileText, ClipboardCheck, ChevronDown, ChevronUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ManageCurriculumPage = () => {
  const [educationalStages, setEducationalStages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [curriculums, setCurriculums] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState({ textbooks: [], summaries: [], youtube: [], exams: [] });
  const [expandedStage, setExpandedStage] = useState(null);
  const [newLinks, setNewLinks] = useState({ textbooks: { title: '', url: '' }, summaries: { title: '', url: '' }, youtube: { title: '', url: '' }, exams: { title: '', url: '' } });

  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndSubscribe = async () => {
      setIsLoading(true);
      try {
        const settingsRef = doc(db, "system_config", "school_system_settings");
        const settingsSnap = await getDoc(settingsRef);
        const stages = settingsSnap.exists() ? settingsSnap.data().educationalStages || [] : [];
        setEducationalStages(stages);
        if (stages.length > 0) setExpandedStage(stages[0].id);

        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"));
        const teachersSnapshot = await getDocs(teachersQuery);
        const fetchedTeachers = teachersSnapshot.docs.map(docData => ({ id: docData.id, ...docData.data() }));
        setTeachers(fetchedTeachers);

        const validStages = stages.filter(stage => stage && typeof stage.id === 'string' && stage.id.trim() !== '');
        const unsubscribes = validStages.map(stage => {
          const curriculumRef = doc(db, "curriculum", stage.id);
          return onSnapshot(curriculumRef, (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : {};
            setCurriculums(prev => ({ ...prev, [stage.id]: data }));
          });
        });

        setIsLoading(false);
        return () => unsubscribes.forEach(unsub => unsub && unsub());
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "خطأ", description: "فشل تحميل بيانات الصفحة.", variant: "destructive" });
        setIsLoading(false);
      }
    };
    fetchAndSubscribe();
  }, [db]);

  const handleSubjectChange = (stageId, semester, subjectIndex, field, value) => {
    setCurriculums(prev => {
      const updatedCurriculums = { ...prev };
      const stageCurriculum = updatedCurriculums[stageId] || {};
      const subjects = stageCurriculum[semester] || [];
      const newSubjects = [...subjects];
      const updatedSubject = { ...newSubjects[subjectIndex], [field]: value };
      if (field === 'teacherId') {
        const teacher = teachers.find(t => t.id === value);
        updatedSubject.teacherName = teacher ? teacher.name : '';
      }
      newSubjects[subjectIndex] = updatedSubject;
      updatedCurriculums[stageId] = { ...stageCurriculum, [semester]: newSubjects };
      return updatedCurriculums;
    });
  };

  const handleAddSubject = (stageId, semester) => {
    const newSubject = { id: `new_${Date.now()}`, name: '', teacherId: '', teacherName: '', content: { textbooks: [], summaries: [], youtube: [], exams: [] } };
    setCurriculums(prev => {
      const stageCurriculum = prev[stageId] || {};
      return { ...prev, [stageId]: { ...stageCurriculum, [semester]: [...(stageCurriculum[semester] || []), newSubject] } };
    });
  };

  const handleRemoveSubject = (stageId, semester, subjectIndex) => {
    setCurriculums(prev => {
      const stageCurriculum = prev[stageId] || {};
      return { ...prev, [stageId]: { ...stageCurriculum, [semester]: (stageCurriculum[semester] || []).filter((_, i) => i !== subjectIndex) } };
    });
  };

  const handleSaveChanges = async (stageId) => {
    setIsSaving(true);
    try {
      const stageCurriculum = curriculums[stageId] || {};
      const curriculumToSave = {};
      for (const semester of ['semesterOneSubjects', 'semesterTwoSubjects']) {
        const subjectsForSemester = stageCurriculum[semester] || [];
        if (subjectsForSemester.some(s => !s.name.trim())) {
          toast({ title: "بيانات ناقصة", description: "اسم المادة لا يمكن أن يكون فارغاً.", variant: "destructive" });
          setIsSaving(false);
          return;
        }
        curriculumToSave[semester] = subjectsForSemester.map(s => ({
          id: s.id.startsWith('new_') ? doc(collection(db, "dummy")).id : s.id,
          name: s.name, teacherId: s.teacherId || '', teacherName: s.teacherName || '',
          content: s.content || { textbooks: [], summaries: [], youtube: [], exams: [] }
        }));
      }
      await setDoc(doc(db, "curriculum", stageId), curriculumToSave, { merge: true });
      toast({ title: "✅ تم الحفظ!", description: "تم حفظ المناهج للمرحلة بنجاح." });
    } catch (error) {
      console.error("Error saving curriculum:", error);
      toast({ title: "خطأ في الحفظ", description: `فشل حفظ المنهج. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const openContentModal = (subject, stageId, semester) => {
    setSelectedSubject({ ...subject, stageId, semester });
    setCurrentContent(subject.content || { textbooks: [], summaries: [], youtube: [], exams: [] });
    setIsContentModalOpen(true);
  };

  const handleNewLinkChange = (type, field, value) => setNewLinks(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));

  const handleAddLink = (type) => {
    const linkData = newLinks[type];
    if (!linkData.url.trim() || !linkData.title.trim()) {
      toast({ title: "خطأ", description: "الرجاء إدخال العنوان والرابط.", variant: "destructive" });
      return;
    }
    setCurrentContent(prev => ({ ...prev, [type]: [...(prev[type] || []), { id: `new_${Date.now()}`, ...linkData }] }));
    setNewLinks(prev => ({ ...prev, [type]: { title: '', url: '' } }));
  };

  const handleRemoveLink = (type, index) => setCurrentContent(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index) }));

  const saveContentChanges = async () => {
    if (!selectedSubject) return;
    setIsSaving(true);
    try {
      const { stageId, semester, id: subjectId } = selectedSubject;
      const stageCurriculum = curriculums[stageId] || {};
      const subjects = stageCurriculum[semester] || [];
      const updatedSubjects = subjects.map(s => s.id === subjectId ? { ...s, content: currentContent } : s);
      await setDoc(doc(db, "curriculum", stageId), { [semester]: updatedSubjects }, { merge: true });
      toast({ title: "✅ تم الحفظ", description: "تم حفظ المحتوى التعليمي بنجاح." });
      setIsContentModalOpen(false);
      setSelectedSubject(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ المحتوى.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const renderSemesterSubjects = (stageId, semester, title) => {
    const subjects = curriculums[stageId]?.[semester] || [];
    return (
      <div className="space-y-3">
        <h4 className="text-orange-300 font-medium text-sm flex items-center gap-2 mb-4">
          <Book className="w-4 h-4" /> {title} ({subjects.length} مادة)
        </h4>
        <AnimatePresence>
          {subjects.map((subject, index) => (
            <motion.div key={subject.id || index} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
              className="p-3 rounded-xl border border-orange-500/20 flex flex-col md:flex-row gap-3 items-start md:items-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <input placeholder="اسم المادة" value={subject.name} onChange={e => handleSubjectChange(stageId, semester, index, 'name', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-orange-500/25 text-white placeholder-orange-400/40 focus:outline-none focus:border-orange-400 text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', minWidth: '0' }} />
              <Select value={subject.teacherId || 'unassigned'} onValueChange={v => handleSubjectChange(stageId, semester, index, 'teacherId', v === 'unassigned' ? '' : v)}>
                <SelectTrigger className="w-full md:w-44 border-orange-500/25 text-white text-sm" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <SelectValue placeholder="اختر المعلم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned"><em>بدون معلم</em></SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openContentModal(subject, stageId, semester)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-orange-500/30 text-orange-300 hover:bg-orange-500/15 text-xs font-medium transition-colors duration-150 whitespace-nowrap">
                  <FilePlus className="w-3.5 h-3.5" /> المحتوى
                </button>
                <button onClick={() => handleRemoveSubject(stageId, semester, index)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors duration-150">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <button onClick={() => handleAddSubject(stageId, semester)}
          className="w-full py-2.5 mt-2 rounded-xl border-2 border-dashed border-orange-500/25 text-orange-300 hover:border-orange-400 hover:bg-orange-500/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> إضافة مادة جديدة
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #431407 30%, #1e3a1e 60%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-200 text-lg">جاري تحميل المناهج...</p>
        </div>
      </div>
    );
  }

  const validStages = educationalStages.filter(stage => stage && typeof stage.id === 'string' && stage.id.trim() !== '');

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #431407 30%, #1e3a1e 60%, #0f172a 100%)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f97316, transparent)' }}></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #ea580c, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                <BookCopy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">إدارة المناهج الدراسية</h1>
                <p className="text-orange-300 text-sm mt-1">إدارة المواد والمحتوى التعليمي لكل مرحلة</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-orange-200 border border-orange-500/30 hover:bg-orange-500/10 transition-all duration-200 self-start sm:self-auto">
              <ArrowLeft className="w-4 h-4" /> العودة للوحة التحكم
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'المراحل الدراسية', value: validStages.length, color: '#f97316' },
            { label: 'إجمالي المعلمين', value: teachers.length, color: '#fb923c' },
            { label: 'المواد المسجلة', value: Object.values(curriculums).reduce((acc, cur) => acc + (cur.semesterOneSubjects?.length || 0) + (cur.semesterTwoSubjects?.length || 0), 0), color: '#fdba74' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 border border-orange-500/20 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <p className="font-bold text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-orange-300 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {validStages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 rounded-2xl border border-orange-500/20" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <BookCopy className="w-16 h-16 text-orange-400/40 mx-auto mb-4" />
            <p className="text-orange-200 text-xl font-semibold mb-2">لا توجد مراحل دراسية</p>
            <p className="text-orange-400/60 text-sm mb-4">اذهب إلى إعدادات النظام لإضافة مراحل</p>
            <button onClick={() => navigate('/admin/settings')} className="px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              إعدادات النظام
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {validStages.map((stage, stageIndex) => (
              <motion.div key={stage.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stageIndex * 0.05 }}
                className="rounded-2xl border border-orange-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                {/* Stage Header */}
                <button onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-orange-500/5 transition-colors duration-150"
                  style={{ background: 'rgba(249,115,22,0.1)', borderBottom: expandedStage === stage.id ? '1px solid rgba(249,115,22,0.2)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.25)' }}>
                      <BookCopy className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="text-right">
                      <h3 className="text-white font-semibold text-lg">{stage.name}</h3>
                      <p className="text-orange-300 text-xs">
                        {(curriculums[stage.id]?.semesterOneSubjects?.length || 0) + (curriculums[stage.id]?.semesterTwoSubjects?.length || 0)} مادة
                        · {stage.semesterSystem === 'two-semesters' ? 'فصلين دراسيين' : 'فصل واحد'}
                      </p>
                    </div>
                  </div>
                  {expandedStage === stage.id ? <ChevronUp className="w-5 h-5 text-orange-400" /> : <ChevronDown className="w-5 h-5 text-orange-400" />}
                </button>

                <AnimatePresence>
                  {expandedStage === stage.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div className="p-6">
                        {stage.semesterSystem === 'two-semesters' ? (
                          <Tabs defaultValue="semester1" className="w-full">
                            <TabsList className="mb-6" style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <TabsTrigger value="semester1" className="data-[state=active]:text-orange-300">الفصل الأول</TabsTrigger>
                              <TabsTrigger value="semester2" className="data-[state=active]:text-orange-300">الفصل الثاني</TabsTrigger>
                            </TabsList>
                            <TabsContent value="semester1">{renderSemesterSubjects(stage.id, 'semesterOneSubjects', 'مواد الفصل الدراسي الأول')}</TabsContent>
                            <TabsContent value="semester2">{renderSemesterSubjects(stage.id, 'semesterTwoSubjects', 'مواد الفصل الدراسي الثاني')}</TabsContent>
                          </Tabs>
                        ) : (
                          renderSemesterSubjects(stage.id, 'semesterOneSubjects', 'مواد الفصل الدراسي')
                        )}

                        <div className="mt-6 pt-4 border-t border-orange-500/20 flex justify-end">
                          <button onClick={() => handleSaveChanges(stage.id)} disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                            حفظ تغييرات المرحلة
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Content Modal */}
      <AnimatePresence>
        {isContentModalOpen && selectedSubject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" style={{ background: 'linear-gradient(135deg, #0f172a, #431407)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <div className="p-5 border-b border-orange-500/20 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white">إدارة محتوى: {selectedSubject.name}</h2>
                  <p className="text-orange-300 text-xs mt-0.5">أضف روابط الكتب، الملخصات، الاختبارات، والفيديوهات</p>
                </div>
                <button onClick={() => setIsContentModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {[
                  { type: 'textbooks', title: 'الكتب المدرسية', icon: Book, color: '#f97316' },
                  { type: 'summaries', title: 'الملخصات', icon: FileText, color: '#fb923c' },
                  { type: 'exams', title: 'الاختبارات', icon: ClipboardCheck, color: '#fbbf24' },
                  { type: 'youtube', title: 'شروحات يوتيوب', icon: Film, color: '#ef4444' },
                ].map(section => (
                  <div key={section.type} className="rounded-xl border border-orange-500/15 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-4 py-3 border-b border-orange-500/10 flex items-center gap-2" style={{ background: 'rgba(249,115,22,0.08)' }}>
                      <section.icon className="w-4 h-4" style={{ color: section.color }} />
                      <h3 className="text-orange-200 text-sm font-semibold">{section.title}</h3>
                      <span className="text-xs text-orange-400 mr-auto">{(currentContent[section.type] || []).length} روابط</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {(currentContent[section.type] || []).map((link, index) => (
                          <div key={link.id || index} className="flex items-center gap-2 p-2.5 rounded-lg border border-orange-500/15" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{link.title}</p>
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 truncate block hover:underline">{link.url}</a>
                            </div>
                            <button onClick={() => handleRemoveLink(section.type, index)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input placeholder="عنوان الرابط" value={newLinks[section.type].title} onChange={e => handleNewLinkChange(section.type, 'title', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-orange-500/25 text-white placeholder-orange-400/40 focus:outline-none focus:border-orange-400 text-sm transition-all"
                          style={{ background: 'rgba(255,255,255,0.07)' }} />
                        <input placeholder="رابط URL" value={newLinks[section.type].url} onChange={e => handleNewLinkChange(section.type, 'url', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-orange-500/25 text-white placeholder-orange-400/40 focus:outline-none focus:border-orange-400 text-sm transition-all"
                          style={{ background: 'rgba(255,255,255,0.07)' }} />
                        <button onClick={() => handleAddLink(section.type)} className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 flex items-center gap-1 whitespace-nowrap" style={{ background: 'rgba(249,115,22,0.3)', border: '1px solid rgba(249,115,22,0.4)' }}>
                          <PlusCircle className="w-4 h-4" /> إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 border-t border-orange-500/20 flex gap-3 shrink-0">
                <button onClick={() => setIsContentModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-orange-500/30 text-orange-200 hover:bg-orange-500/10 transition-all text-sm font-medium">إلغاء</button>
                <button onClick={saveContentChanges} disabled={isSaving} className="flex-1 py-2.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                  {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                  حفظ المحتوى
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageCurriculumPage;