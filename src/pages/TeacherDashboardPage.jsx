import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { FilePlus, MessageSquare, PlusCircle, Book, Film, Link as LinkIcon, Video, ExternalLink, FileText, ClipboardCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, doc, getDoc, collection, setDoc, onSnapshot, query, where } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

const TeacherDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [onlineRooms, setOnlineRooms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const db = getFirestore();

  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null); 
  const [currentContent, setCurrentContent] = useState({ textbooks: [], summaries: [], youtube: [], exams: [] });
  const [newLinks, setNewLinks] = useState({
    textbooks: { title: '', url: '' },
    summaries: { title: '', url: '' },
    youtube: { title: '', url: '' },
    exams: { title: '', url: '' },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  // كاش لحجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;

  useEffect(() => {
    if (!user?.uid) {
        setLoadingData(false);
        return;
    }
    setLoadingData(true);

    const curriculumRef = collection(db, "curriculum");
    const unsubscribeCurriculum = onSnapshot(curriculumRef, async (querySnapshot) => {
        try {
            const settingsRef = doc(db, "system_config", "school_system_settings");
            const settingsSnap = await getDoc(settingsRef);
            const stages = settingsSnap.exists() ? settingsSnap.data().educationalStages || [] : [];
            
            const allSubjectsForTeacher = [];
            querySnapshot.forEach((docSnap) => {
                const stageId = docSnap.id;
                const stageData = docSnap.data();
                const stageDetails = stages.find(s => s.id === stageId);

                // إذا تم حذف المرحلة من قبل المدير (غير موجودة في إعدادات النظام)، نتجاهلها تماماً
                if (!stageDetails) return;

                ['semesterOneSubjects', 'semesterTwoSubjects'].forEach(semesterKey => {
                    const stageSubjects = stageData[semesterKey] || [];
                    stageSubjects.forEach(subject => {
                        if (subject.teacherId === user.uid) {
                            allSubjectsForTeacher.push({
                                ...subject,
                                stageId: stageId,
                                semesterKey: semesterKey,
                                stageName: stageDetails.name,
                                semesterName: semesterKey === 'semesterOneSubjects' ? 'الفصل الأول' : 'الفصل الثاني'
                            });
                        }
                    });
                });
            });
            setAssignedSubjects(allSubjectsForTeacher);
        } catch (error) {
            console.error("Error processing curriculum data:", error);
            toast({ 
              title: "خطأ", 
              description: "فشل في معالجة بيانات المناهج.", 
              variant: "destructive" 
            });
        } finally {
            setLoadingData(false);
        }
    });

    return () => unsubscribeCurriculum();
  }, [db, user?.uid]);
  
  const teacherStageIds = useMemo(() => {
    return [...new Set(assignedSubjects.map(s => s.stageId))];
  }, [assignedSubjects]);

  useEffect(() => {
      if (teacherStageIds.length === 0) {
          setOnlineRooms([]);
          return;
      }
      const roomsQuery = query(collection(db, "online_classrooms"), where("stageId", "in", teacherStageIds));
      const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
          setOnlineRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribeRooms();
  }, [db, teacherStageIds]);

  const openContentModal = (subject) => {
    setEditingSubject(subject);
    setCurrentContent(subject.content || { textbooks: [], summaries: [], youtube: [], exams: [] });
    setIsContentModalOpen(true);
  };

  const handleNewLinkChange = (type, field, value) => {
    setNewLinks(prev => ({ 
      ...prev, 
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const handleAddLink = (type) => {
    const linkData = newLinks[type];
    if (!linkData.url.trim() || !linkData.title.trim()) {
        toast({ 
          title: "خطأ", 
          description: "الرجاء إدخال العنوان والرابط.", 
          variant: "destructive" 
        });
        return;
    }
    setCurrentContent(prev => ({
      ...prev, 
      [type]: [...(prev[type] || []), { 
        id: `new_${Date.now()}`, 
        ...linkData 
      }] 
    }));
    setNewLinks(prev => ({ ...prev, [type]: { title: '', url: '' } }));
  };

  const handleRemoveLink = (type, index) => {
    setCurrentContent(prev => ({ 
      ...prev, 
      [type]: (prev[type] || []).filter((_, i) => i !== index) 
    }));
  };

  const handleSaveChangesToContent = async () => {
    if (!editingSubject) return;
    setIsSaving(true);
    try {
        const curriculumRef = doc(db, "curriculum", editingSubject.stageId);
        const curriculumSnap = await getDoc(curriculumRef);

        if(!curriculumSnap.exists()){ 
          throw new Error("Curriculum document not found!"); 
        }
        
        const stageData = curriculumSnap.data();
        const subjectsInSemester = stageData[editingSubject.semesterKey] || [];
        const updatedSubjects = subjectsInSemester.map(s => 
          s.id === editingSubject.id ? { ...s, content: currentContent } : s
        );
        
        await setDoc(curriculumRef, { [editingSubject.semesterKey]: updatedSubjects }, { merge: true });
        toast({ 
          title: "نجاح", 
          description: "تم تحديث المحتوى بنجاح." 
        });
        setIsContentModalOpen(false);
    } catch (error) {
        console.error("Error updating content:", error);
        toast({ 
          title: "خطأ", 
          description: `فشل تحديث المحتوى. ${error.message}`, 
          variant: "destructive" 
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const quickActions = [
    { 
      label: "الرسائل", 
      icon: <MessageSquare size={isMobile ? 18 : 20}/>, 
      action: () => navigate('/chat') 
    },
  ];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm sm:text-base">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] relative overflow-hidden">
      {/* شبكة خلفية هندسية ناعمة */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      
      {/* دوائر إضاءة ملونة ضخمة (Mesh Gradients) لتبدو احترافية وعصرية */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 to-purple-500/10 blur-[130px] z-0 pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-500/10 blur-[130px] z-0 pointer-events-none animate-pulse" style={{ animationDuration: '10s' }}></div>
      <div className="absolute top-[30%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-400/5 blur-[100px] z-0 pointer-events-none"></div>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {/* الهيدر */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-6 sm:mb-8 md:mb-10"
        >
          <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent rounded-2xl p-6 sm:p-8 mb-6 border border-primary/20 shadow-sm relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/25 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-primary/20 rounded-xl text-primary">
                    <Book size={28} className="sm:w-10 sm:h-10" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                    لوحة تحكم <span className="text-primary">المعلم</span>
                  </h1>
                </div>
                <p className="text-muted-foreground text-base sm:text-lg md:text-xl pr-2 sm:pr-16 flex flex-wrap items-center gap-2 mt-3 font-semibold text-gray-700">
                  مرحباً بك، أ. {user?.name || 'المعلم'}
                </p>
              </div>
              
              {/* إحصائيات سريعة كبطاقات مصغرة متجاوبة مع الشاشات الصغيرة */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 md:gap-4 self-start md:self-auto mt-2 md:mt-0 w-full sm:w-auto">
                <div className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm rounded-xl px-4 py-2.5 flex items-center gap-3 flex-1 sm:flex-initial min-w-[120px]">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Book size={18} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">المواد المسندة</p>
                    <p className="text-lg font-bold text-gray-800">{assignedSubjects.length}</p>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm rounded-xl px-4 py-2.5 flex items-center gap-3 flex-1 sm:flex-initial min-w-[120px]">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <Video size={18} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">الغرف الافتراضية</p>
                    <p className="text-lg font-bold text-gray-800">{onlineRooms.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      {/* المحتوى الرئيسي */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* العمود الرئيسي */}
        <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          {/* المواد الدراسية */}
          <Card className="shadow-xl border-0 overflow-hidden bg-white/70 backdrop-blur-md border border-white/40 relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-primary"></div>
            <CardHeader className="p-5 sm:p-6 border-b border-gray-100/80">
              <CardTitle className="text-xl sm:text-2xl font-extrabold text-gray-800 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Book size={22} />
                </div>
                المواد الدراسية والمحتوى التعليمي
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium mt-1">
                إدارة وتعديل المحتوى التعليمي للمواد المسندة إليك
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {assignedSubjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedSubjects.map((subject) => (
                    <motion.div
                      key={subject.id}
                      whileHover={{ y: -3, scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 h-full overflow-hidden flex flex-col justify-between">
                        <div className="p-4 sm:p-5 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate mb-2">
                                {subject.name}
                              </h3>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs px-2.5 py-0.5 border border-blue-100/50 font-semibold">
                                  {subject.stageName}
                                </Badge>
                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs px-2.5 py-0.5 border border-purple-100/50 font-semibold">
                                  {subject.semesterName}
                                </Badge>
                              </div>
                            </div>
                            <div className="p-2 bg-gray-50 text-gray-400 rounded-lg shrink-0">
                              <Book size={20} />
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50/50 px-4 py-3 sm:px-5 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-semibold">
                            المحتوى نشط
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openContentModal(subject)}
                            className="shadow-sm font-bold gap-1 text-xs border-primary/30 text-primary hover:bg-primary/5"
                          >
                            <FilePlus className="h-3.5 w-3.5" />
                            <span>إدارة المحتوى</span>
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-14 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
                  <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold text-base sm:text-lg">
                    لم يتم إسناد أي مواد دراسية لك بعد
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    يرجى مراجعة المسؤول لتفعيل المواد المسندة إليك
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* الإجراءات السريعة */}
          <Card className="shadow-xl border-0 overflow-hidden bg-white/70 backdrop-blur-sm relative">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <PlusCircle size={18} className="text-primary" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <motion.div 
                    key={index} 
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <Card 
                      onClick={action.action} 
                      className="shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer h-full flex flex-col items-center justify-center p-5 text-center bg-white border border-gray-100"
                    >
                      <div className="p-3 mb-3 rounded-full bg-primary/10 text-primary">
                        {action.icon}
                      </div>
                      <p className="font-bold text-sm sm:text-base text-gray-800">
                        {action.label}
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* الشريط الجانبي */}
        <div className="xl:col-span-1">
          <Card className="shadow-xl border-0 bg-gradient-to-b from-white to-gray-50/50 sticky top-24 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 via-pink-500 to-purple-500"></div>
            <CardHeader className="p-5 sm:p-6 pb-2">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-100 mr-2 ml-0 rtl:ml-2 rtl:mr-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <Video className="text-red-600 relative z-10" size={16} />
                </div>
                البث المباشر
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium mt-1">
                حصص أونلاين نشطة للمراحل الدراسية الخاصة بك
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2">
              {onlineRooms.length > 0 ? (
                <div className="space-y-3">
                  {onlineRooms.map(room => (
                    <a 
                      key={room.id} 
                      href={room.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.03, y: -2 }} 
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-red-200 transition-all relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-1 h-full bg-red-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                        <p className="font-bold text-gray-800 text-sm sm:text-base group-hover:text-red-600 transition-colors">{room.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold">
                            مباشر الآن
                          </Badge>
                          <span className="text-xs font-semibold text-red-600 flex items-center group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
                            انضمام
                            <ExternalLink size={12} className="ml-1 mr-0 rtl:mr-1 rtl:ml-0" />
                          </span>
                        </div>
                      </motion.div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Video className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-center text-gray-500 font-medium text-xs sm:text-sm">
                    لا توجد حصص مباشرة حالياً
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal إدارة المحتوى */}
      <AnimatePresence>
        {isContentModalOpen && editingSubject && (
          <Dialog open={isContentModalOpen} onOpenChange={setIsContentModalOpen}>
            <DialogContent className={`
              max-w-[95vw] w-full mx-2 sm:mx-4
              ${isMobile ? 'max-h-[90vh]' : 'max-h-[80vh]'}
              overflow-y-auto
            `}>
              <DialogHeader className="p-4 sm:p-6 pb-0">
                <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <FilePlus size={isMobile ? 18 : 20} />
                  إدارة محتوى: {editingSubject.name}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  أضف روابط الكتب، الملخصات، الاختبارات، والفيديوهات لهذه المادة
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {[
                  {type: 'textbooks', title: 'المساعد الذكي', icon: <Book size={isMobile ? 16 : 18}/>, color: 'text-purple-700 bg-purple-50 border-purple-100'}, 
                  {type: 'summaries', title: 'الملخصات والكتب', icon: <FileText size={isMobile ? 16 : 18}/>, color: 'text-blue-700 bg-blue-50 border-blue-100'}, 
                  {type: 'exams', title: 'الاختبارات', icon: <ClipboardCheck size={isMobile ? 16 : 18}/>, color: 'text-orange-700 bg-orange-50 border-orange-100'}, 
                  {type: 'youtube', title: 'شروحات يوتيوب', icon: <Film size={isMobile ? 16 : 18}/>, color: 'text-red-700 bg-red-50 border-red-100'}
                ].map(section => (
                  <div key={section.type} className={`space-y-3 p-4 rounded-xl border ${section.color.split(' ')[2]} ${section.color.split(' ')[1]}`}>
                    <h3 className={`text-base sm:text-lg font-bold flex items-center gap-2 ${section.color.split(' ')[0]}`}>
                      {section.icon}
                      <span>{section.title}</span>
                    </h3>
                    
                    {/* القائمة الحالية */}
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {(currentContent[section.type] || []).map((link, index) => (
                        <div key={link.id || index} className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                          <div className="flex-grow min-w-0">
                            <p className="font-bold text-sm sm:text-base text-gray-800 truncate">
                              {link.title}
                            </p>
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs sm:text-sm text-primary font-medium truncate block hover:underline"
                            >
                              {link.url}
                            </a>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveLink(section.type, index)}
                            className="shrink-0 h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(currentContent[section.type] || []).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">لا توجد روابط مضافة حالياً</p>
                      )}
                    </div>
                    
                    {/* إضافة رابط جديد */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-gray-100/50">
                      <Input 
                        placeholder="عنوان الرابط (مثال: الكتاب المدرسي)"
                        value={newLinks[section.type].title}
                        onChange={e => handleNewLinkChange(section.type, 'title', e.target.value)}
                        className="bg-white border-gray-200 text-xs sm:text-sm focus-visible:ring-primary"
                      />
                      <Input 
                        placeholder="الرابط (URL)"
                        value={newLinks[section.type].url}
                        onChange={e => handleNewLinkChange(section.type, 'url', e.target.value)}
                        className="bg-white border-gray-200 text-xs sm:text-sm focus-visible:ring-primary"
                        style={{ direction: 'ltr', textAlign: 'right' }}
                      />
                      <Button 
                        onClick={() => handleAddLink(section.type)}
                        size="sm"
                        className="shrink-0 font-bold gap-1"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>إضافة</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <DialogFooter className="p-4 sm:p-6 pt-0">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsContentModalOpen(false)}
                    size={isMobile ? "sm" : "default"}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleSaveChangesToContent} 
                    disabled={isSaving}
                    size={isMobile ? "sm" : "default"}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-background border-t-transparent ml-1" />
                        جاري الحفظ...
                      </>
                    ) : (
                      'حفظ المحتوى'
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;