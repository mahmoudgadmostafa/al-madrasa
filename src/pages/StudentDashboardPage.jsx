import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Book, Film, Video, ExternalLink, FileText, ClipboardCheck, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFirestore, doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const StudentDashboardPage = () => {
  const { user, schoolSettings } = useAuth();
  const [subjects, setSubjects] = useState({ semesterOneSubjects: [], semesterTwoSubjects: [] });
  const [onlineRooms, setOnlineRooms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState({ subjectId: null, videoId: null });
  const [selectedBook, setSelectedBook] = useState({ subjectId: null, bookId: null });
  const [selectedSummary, setSelectedSummary] = useState({ subjectId: null, summaryId: null });
  const [selectedExam, setSelectedExam] = useState({ subjectId: null, examId: null });
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const db = getFirestore();

  const studentStage = schoolSettings.educationalStages.find(s => s.id === user?.stageId);

  useEffect(() => {
    if (!user?.stageId) {
      setLoadingData(false);
      return;
    }

    const curriculumRef = doc(db, "curriculum", user.stageId);
    const unsubscribeCurriculum = onSnapshot(curriculumRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubjects({
          semesterOneSubjects: data.semesterOneSubjects || [],
          semesterTwoSubjects: data.semesterTwoSubjects || []
        });
      } else {
        setSubjects({ semesterOneSubjects: [], semesterTwoSubjects: [] });
      }
      setLoadingData(false);
    });

    const roomsQuery = query(collection(db, "online_classrooms"), where("stageId", "==", user.stageId));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOnlineRooms(fetchedRooms);
    });

    return () => {
      unsubscribeCurriculum();
      unsubscribeRooms();
    };
  }, [db, user?.stageId]);

  const getYouTubeEmbedUrl = (url) => {
    try {
      if (!url) return null;
      let videoId;
      if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
      else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split('&')[0];
      else if (url.includes('/embed/')) videoId = url.split('/embed/')[1].split('?')[0];
      else if (url.includes('/shorts/')) videoId = url.split('/shorts/')[1].split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  };

  const handleVideoSelect = (videoId, subjectId, videoList) => {
    const video = videoList.find(i => i.id === videoId);
    if (video) {
      setSelectedVideo({ subjectId, videoId });
      const embedUrl = getYouTubeEmbedUrl(video.url); // هنا يجب أن يكون video.url وليس video.title
      if (embedUrl) {
        setCurrentVideo({
          url: embedUrl,
          title: video.title || 'فيديو تعليمي' // استخدام العنوان الصحيح
        });
      }
    }
  };

  const openVideoDialog = () => {
    if (currentVideo) {
      setVideoDialogOpen(true);
    }
  };

  const renderResourceLink = (resource, type) => {
    if (!resource) return null;
    
    // إذا كان الرابط هو رابط يوتيوب، نعرضه في الدايلوج
    if (type === 'youtube' && resource.url && resource.url.includes('youtube')) {
      const embedUrl = getYouTubeEmbedUrl(resource.url);
      if (embedUrl) {
        return (
          <Button 
            onClick={() => {
              setCurrentVideo({
                url: embedUrl,
                title: resource.title
              });
              setVideoDialogOpen(true);
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 mt-2"
          >
            <Play size={16} />
            تشغيل الفيديو
          </Button>
        );
      }
    }
    
    // للروابط العادية، نفتحها في تاب جديد
    return (
      <a 
        href={resource.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block mt-2 text-sm text-blue-600 hover:underline flex items-center"
      >
        {type === 'textbooks' && 'التحدث مع المساعد الذكي'}
        {type === 'summaries' && 'فتح الملخص أو الكتاب'}
        {type === 'exams' && 'فتح الاختبار'}
        <ExternalLink size={14} className="mr-2" />
      </a>
    );
  };

  const renderSubjectsAccordion = (subjectList, semester) => (
    <Accordion type="single" collapsible className="w-full">
      {subjectList.map(subject => (
        <AccordionItem key={subject.id} value={subject.id}>
          <AccordionTrigger className="text-lg">{subject.name}</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-4">المعلم: {subject.teacherName || 'غير محدد'}</p>

            {/* اسال المساعد الذكي */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary">
              <Book size={18} />
              <span className="mr-2">اسال مساعدك الذكي</span>
            </h4>
            {subject.content?.textbooks?.length > 0 ? (
              <>
                <Select onValueChange={(value) => {
                  const book = subject.content.textbooks.find(i => i.id === value);
                  setSelectedBook({ subjectId: subject.id, bookId: value });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مساعدك" />
                  </SelectTrigger>
                  <SelectContent>
                    {subject.content.textbooks.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title || `مساعد ${subject.name}`} {/* عرض العنوان بدلاً من الرابط */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBook.subjectId === subject.id && (() => {
                  const book = subject.content.textbooks.find(i => i.id === selectedBook.bookId);
                  return book ? renderResourceLink(book, 'textbooks') : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا يوجد مساعد ذكي.</p>}

            {/* كتب وملخصات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary">
              <FileText size={18} />
              <span className="mr-2">الملخصات والكتب</span>
            </h4>
            {subject.content?.summaries?.length > 0 ? (
              <>
                <Select onValueChange={(value) => {
                  const summary = subject.content.summaries.find(i => i.id === value);
                  setSelectedSummary({ subjectId: subject.id, summaryId: value });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر ملخصا او كتاب" />
                  </SelectTrigger>
                  <SelectContent>
                    {subject.content.summaries.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title || `ملخص ${subject.name}`} {/* عرض العنوان بدلاً من الرابط */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSummary.subjectId === subject.id && (() => {
                  const summary = subject.content.summaries.find(i => i.id === selectedSummary.summaryId);
                  return summary ? renderResourceLink(summary, 'summaries') : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا توجد كتب او ملخصات</p>}

            {/* الاختبارات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary">
              <ClipboardCheck size={18} />
              <span className="mr-2">الاختبارات</span>
            </h4>
            {subject.content?.exams?.length > 0 ? (
              <>
                <Select onValueChange={(value) => {
                  const exam = subject.content.exams.find(i => i.id === value);
                  setSelectedExam({ subjectId: subject.id, examId: value });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اختباراً" />
                  </SelectTrigger>
                  <SelectContent>
                    {subject.content.exams.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title || `اختبار ${subject.name}`} {/* عرض العنوان بدلاً من الرابط */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedExam.subjectId === subject.id && (() => {
                  const exam = subject.content.exams.find(i => i.id === selectedExam.examId);
                  return exam ? renderResourceLink(exam, 'exams') : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا توجد اختبارات.</p>}

            {/* الفيديوهات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary">
              <Film size={18} />
              <span className="mr-2">شروحات الفيديو</span>
            </h4>
            {subject.content?.youtube?.length > 0 ? (
              <>
                <Select onValueChange={(value) => {
                  const video = subject.content.youtube.find(i => i.id === value);
                  if (video) {
                    const embedUrl = getYouTubeEmbedUrl(video.url);
                    if (embedUrl) {
                      setCurrentVideo({
                        url: embedUrl,
                        title: video.title || `فيديو ${subject.name}`
                      });
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر فيديو" />
                  </SelectTrigger>
                  <SelectContent>
                    {subject.content.youtube.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title || `فيديو ${subject.name}`} {/* عرض العنوان بدلاً من الرابط */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentVideo && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                    <p className="font-semibold mb-3 text-center">{currentVideo.title}</p>
                    <div className="flex justify-center">
                      <Button 
                        onClick={openVideoDialog} 
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                      >
                        <Play size={16} />
                        تشغيل الفيديو
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">لا توجد فيديوهات.</p>}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">لوحة تحكم الطالب</h1>
        <p className="text-right text-lg font-bold text-red-600">
          مرحباً بك، {user?.name}
        </p>
        <p className="text-center text-xl font-bold text-primary my-4">
          هنا تجد موادك الدراسية والمحتوى التعليمي
        </p>
        <p className="text-muted-foreground mb-2">المرحلة التعليمية: {studentStage?.name || "غير محددة"}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>المواد الدراسية</CardTitle>
            </CardHeader>
            <CardContent>
              {studentStage?.semesterSystem === 'two-semesters' ? (
                <Tabs defaultValue="semester1">
                  <TabsList>
                    <TabsTrigger value="semester1">الفصل الأول</TabsTrigger>
                    <TabsTrigger value="semester2">الفصل الثاني</TabsTrigger>
                  </TabsList>
                  <TabsContent value="semester1">
                    {renderSubjectsAccordion(subjects.semesterOneSubjects, 'semester1')}
                  </TabsContent>
                  <TabsContent value="semester2">
                    {renderSubjectsAccordion(subjects.semesterTwoSubjects, 'semester2')}
                  </TabsContent>
                </Tabs>
              ) : (
                renderSubjectsAccordion(subjects.semesterOneSubjects, 'single')
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="mr-2 text-primary" /> 
                الغرف الافتراضية
              </CardTitle>
              <CardDescription>روابط الحصص الأونلاين المباشرة.</CardDescription>
            </CardHeader>
            <CardContent>
              {onlineRooms.length > 0 ? (
                <div className="space-y-3">
                  {onlineRooms.map(room => (
                    <a 
                      key={room.id} 
                      href={room.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.05 }} 
                        className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <p className="font-bold text-primary">{room.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          انقر للانضمام
                          <ExternalLink size={14} className="ml-2 rtl:ml-0 rtl:mr-2" />
                        </p>
                      </motion.div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4">لا توجد غرف افتراضية متاحة حالياً.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog لعرض الفيديو */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{currentVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-lg">
            {currentVideo && (
              <iframe 
                src={currentVideo.url} 
                width="100%" 
                height="100%" 
                title={currentVideo.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="min-h-[400px]"
              ></iframe>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboardPage;
