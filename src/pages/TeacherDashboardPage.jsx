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

                ['semesterOneSubjects', 'semesterTwoSubjects'].forEach(semesterKey => {
                    const stageSubjects = stageData[semesterKey] || [];
                    stageSubjects.forEach(subject => {
                        if (subject.teacherId === user.uid) {
                            allSubjectsForTeacher.push({
                                ...subject,
                                stageId: stageId,
                                semesterKey: semesterKey,
                                stageName: stageDetails ? stageDetails.name : "مرحلة غير معروفة",
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
    <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
      {/* الهيدر */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
              لوحة تحكم المعلم
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              مرحباً بك، {user?.name}
            </p>
          </div>
          
          {/* إحصائيات سريعة */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {assignedSubjects.length} مادة
            </Badge>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {onlineRooms.length} غرفة
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* المحتوى الرئيسي */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* العمود الرئيسي */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
          {/* المواد الدراسية */}
          <Card className="shadow-lg border-0">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Book size={isMobile ? 18 : 20} className="text-primary" />
                المواد الدراسية والمحتوى التعليمي
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                عرض وتعديل المحتوى التعليمي للمواد المسندة إليك
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {assignedSubjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {assignedSubjects.map((subject) => (
                    <motion.div
                      key={subject.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-muted/30 border hover:shadow-md transition-all duration-200 h-full">
                        <CardHeader className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg font-semibold truncate">
                                {subject.name}
                              </CardTitle>
                              <CardDescription className="text-xs sm:text-sm flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {subject.stageName}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {subject.semesterName}
                                </Badge>
                              </CardDescription>
                            </div>
                            <Button 
                              variant="outline" 
                              size={isMobile ? "sm" : "default"}
                              onClick={() => openContentModal(subject)}
                              className="shrink-0"
                            >
                              <FilePlus className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="text-xs sm:text-sm">إدارة المحتوى</span>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Book className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">
                    لم يتم إسناد أي مواد دراسية لك بعد
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* الإجراءات السريعة */}
          <Card className="shadow-lg border-0">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                      className="shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center border-2 border-transparent hover:border-primary/20"
                    >
                      <div className="p-2 sm:p-3 mb-2 sm:mb-3 rounded-full bg-primary/10 text-primary">
                        {action.icon}
                      </div>
                      <p className="font-semibold text-sm sm:text-base text-foreground">
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
          <Card className="shadow-lg border-0 sticky top-4">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Video size={isMobile ? 18 : 20} className="text-primary" />
                الغرف الافتراضية
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                روابط الحصص الأونلاين المباشرة
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {onlineRooms.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {onlineRooms.map(room => (
                    <motion.a 
                      key={room.id} 
                      href={room.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-3 sm:p-4 bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors duration-200 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary text-sm sm:text-base truncate">
                              {room.name}
                            </p>
                            <p className="text-muted-foreground text-xs sm:text-sm flex items-center mt-1">
                              انقر للانضمام
                              <ExternalLink size={12} className="mr-1" />
                            </p>
                          </div>
                          <ExternalLink size={16} className="text-primary shrink-0" />
                        </div>
                      </Card>
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Video className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    لا توجد غرف افتراضية متاحة حالياً للمراحل التي تدرسها
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
                  {type: 'textbooks', title: 'المساعد الذكي', icon: <Book size={isMobile ? 16 : 18}/>}, 
                  {type: 'summaries', title: 'الملخصات والكتب', icon: <FileText size={isMobile ? 16 : 18}/>}, 
                  {type: 'exams', title: 'الاختبارات', icon: <ClipboardCheck size={isMobile ? 16 : 18}/>}, 
                  {type: 'youtube', title: 'شروحات يوتيوب', icon: <Film size={isMobile ? 16 : 18}/>}
                ].map(section => (
                  <div key={section.type} className="space-y-3">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      {section.icon}
                      <span>{section.title}</span>
                    </h3>
                    
                    {/* القائمة الحالية */}
                    <div className={`
                      space-y-2 max-h-32 overflow-y-auto pr-2
                      ${isMobile ? 'border rounded-lg p-2' : ''}
                    `}>
                      {(currentContent[section.type] || []).map((link, index) => (
                        <div key={link.id || index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                          <div className="flex-grow min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">
                              {link.title}
                            </p>
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs sm:text-sm text-primary truncate block hover:underline"
                            >
                              {link.url}
                            </a>
                          </div>
                          <Button 
                            variant="ghost" 
                            size={isMobile ? "sm" : "default"}
                            onClick={() => handleRemoveLink(section.type, index)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* إضافة رابط جديد */}
                    <div className={`
                      flex gap-2
                      ${isMobile ? 'flex-col' : 'flex-row'}
                    `}>
                      <Input 
                        placeholder="عنوان الرابط"
                        value={newLinks[section.type].title}
                        onChange={e => handleNewLinkChange(section.type, 'title', e.target.value)}
                        className={isMobile ? 'text-sm' : ''}
                      />
                      <Input 
                        placeholder="الرابط (URL)"
                        value={newLinks[section.type].url}
                        onChange={e => handleNewLinkChange(section.type, 'url', e.target.value)}
                        className={isMobile ? 'text-sm' : ''}
                      />
                      <Button 
                        onClick={() => handleAddLink(section.type)}
                        size={isMobile ? "sm" : "default"}
                        className={isMobile ? 'w-full' : 'shrink-0'}
                      >
                        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                        <span className="text-xs sm:text-sm">إضافة</span>
                      </Button>
                    </div>
                    
                    <Separator className="my-4" />
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
  );
};

export default TeacherDashboardPage;
