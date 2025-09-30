
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
            toast({ title: "خطأ", description: "فشل في معالجة بيانات المناهج.", variant: "destructive" });
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
    setNewLinks(prev => ({ ...prev, [type]: { ...prev[type], [field]: value }}));
  };

  const handleAddLink = (type) => {
    const linkData = newLinks[type];
    if (!linkData.url.trim() || !linkData.title.trim()) {
        toast({ title: "خطأ", description: "الرجاء إدخال العنوان والرابط.", variant: "destructive" });
        return;
    }
    setCurrentContent(prev => ({...prev, [type]: [...(prev[type] || []), { id: `new_${Date.now()}`, ...linkData }] }));
    setNewLinks(prev => ({ ...prev, [type]: { title: '', url: '' } }));
  };

  const handleRemoveLink = (type, index) => {
    setCurrentContent(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index) }));
  };

  const handleSaveChangesToContent = async () => {
    if (!editingSubject) return;
    setIsSaving(true);
    try {
        const curriculumRef = doc(db, "curriculum", editingSubject.stageId);
        const curriculumSnap = await getDoc(curriculumRef);

        if(!curriculumSnap.exists()){ throw new Error("Curriculum document not found!"); }
        
        const stageData = curriculumSnap.data();
        const subjectsInSemester = stageData[editingSubject.semesterKey] || [];
        const updatedSubjects = subjectsInSemester.map(s => s.id === editingSubject.id ? { ...s, content: currentContent } : s);
        
        await setDoc(curriculumRef, { [editingSubject.semesterKey]: updatedSubjects }, { merge: true });
        toast({ title: "نجاح", description: "تم تحديث المحتوى بنجاح." });
        setIsContentModalOpen(false);
    } catch (error) {
        console.error("Error updating content:", error);
        toast({ title: "خطأ", description: `فشل تحديث المحتوى. ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  const quickActions = [
    { label: "الرسائل", icon: <MessageSquare/>, action: () => navigate('/chat') },
  ];

  if (loadingData) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">لوحة تحكم المعلم</h1>
        <p className="text-muted-foreground">مرحباً بك، {user?.name}.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>المواد الدراسية والمحتوى التعليمي</CardTitle>
                <CardDescription>عرض وتعديل المحتوى التعليمي للمواد المسندة إليك.</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedSubjects.length > 0 ? (
                  <div className="space-y-4">
                    {assignedSubjects.map((subject) => (
                        <Card key={subject.id} className="bg-muted/30">
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <div>
                                  <CardTitle className="text-xl">{subject.name}</CardTitle>
                                  <CardDescription>{subject.stageName} - {subject.semesterName}</CardDescription>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => openContentModal(subject)}>
                                  <FilePlus className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> إدارة المحتوى
                              </Button>
                            </div>
                          </CardHeader>
                        </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center p-4">لم يتم إسناد أي مواد دراسية لك بعد.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle>إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action, index) => (
                  <motion.div key={index} whileHover={{ y: -5 }} className="h-full">
                      <Card onClick={action.action} className="shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full flex flex-col items-center justify-center p-4 text-center">
                      <div className="p-3 mb-2 rounded-full bg-primary/10 text-primary">{React.cloneElement(action.icon, { size: 28 })}</div>
                      <p className="font-semibold text-sm text-foreground">{action.label}</p>
                      </Card>
                  </motion.div>
                  ))}
              </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-24">
              <CardHeader>
                  <CardTitle className="flex items-center"><Video className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 text-primary"/> الغرف الافتراضية</CardTitle>
                  <CardDescription>روابط الحصص الأونلاين المباشرة.</CardDescription>
              </CardHeader>
              <CardContent>
                  {onlineRooms.length > 0 ? (
                      <div className="space-y-3">
                          {onlineRooms.map(room => (
                              <a key={room.id} href={room.url} target="_blank" rel="noopener noreferrer">
                                  <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer">
                                      <p className="font-bold text-primary">{room.name}</p>
                                      <p className="text-sm text-muted-foreground flex items-center">انقر هنا للانضمام<ExternalLink size={14} className="mr-2 rtl:mr-0 rtl:ml-2"/></p>
                                  </motion.div>
                              </a>
                          ))}
                      </div>
                  ) : (
                      <p className="text-center text-muted-foreground p-4">لا توجد غرف افتراضية متاحة حالياً للمراحل التي تدرسها.</p>
                  )}
              </CardContent>
          </Card>
        </div>
      </div>
      
      <AnimatePresence>
        {isContentModalOpen && editingSubject && (
          <Dialog open={isContentModalOpen} onOpenChange={setIsContentModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إدارة محتوى: {editingSubject.name}</DialogTitle>
                <DialogDescription>أضف روابط الكتب، الملخصات، الاختبارات، والفيديوهات لهذه المادة.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {[
                    {type: 'textbooks', title: 'رابط الممساعد الذكي ', icon: <Book/>}, 
                    {type: 'summaries', title: 'الملخصات والكتب', icon: <FileText/>}, 
                    {type: 'exams', title: 'الاختبارات', icon: <ClipboardCheck/>}, 
                    {type: 'youtube', title: 'شروحات يوتيوب', icon: <Film/> }
                ].map(section => (
                    <div key={section.type}>
                        <h3 className="text-lg font-semibold mb-2 flex items-center">{section.icon}<span className="mr-2 rtl:mr-0 rtl:ml-2">{section.title}</span></h3>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {(currentContent[section.type] || []).map((link, index) => (
                                <div key={link.id || index} className="flex items-center gap-2 p-2 border rounded-md">
                                    <div className="flex-grow">
                                        <p className="font-medium">{link.title}</p>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary truncate block">{link.url}</a>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(section.type, index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Input placeholder="عنوان الرابط" value={newLinks[section.type].title} onChange={e => handleNewLinkChange(section.type, 'title', e.target.value)} />
                            <Input placeholder="الرابط (URL)" value={newLinks[section.type].url} onChange={e => handleNewLinkChange(section.type, 'url', e.target.value)} />
                            <Button onClick={() => handleAddLink(section.type)}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                        <Separator className="my-4" />
                    </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsContentModalOpen(false)}>إلغاء</Button>
                <Button onClick={handleSaveChangesToContent} disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ المحتوى'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherDashboardPage;
