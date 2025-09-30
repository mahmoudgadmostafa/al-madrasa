import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Book, Film, Video, ExternalLink, FileText, ClipboardCheck } from 'lucide-react';
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

const StudentDashboardPage = () => {
  const { user, schoolSettings } = useAuth();
  const [subjects, setSubjects] = useState({ semesterOneSubjects: [], semesterTwoSubjects: [] });
  const [onlineRooms, setOnlineRooms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(null);
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

  const renderSubjectsAccordion = (subjectList) => (
    <Accordion type="single" collapsible className="w-full">
      {subjectList.map(subject => (
        <AccordionItem key={subject.id} value={subject.id}>
          <AccordionTrigger className="text-lg">{subject.name}</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-4">المعلم: {subject.teacherName || 'غير محدد'}</p>

            {/* اسال المساعد الذكي */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary"><Book size={18} /><span className="mr-2">اسال مساعدك الذكي</span></h4>
            {subject.content?.textbooks?.length > 0 ? (
              <>
                <Select onValueChange={setSelectedBookId}>
                  <SelectTrigger><SelectValue placeholder="اختر مساعدك" /></SelectTrigger>
                  <SelectContent>
                    {subject.content.textbooks.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.url}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const book = subject.content.textbooks.find(i => i.id === selectedBookId);
                  return book ? (
                    <a href={book.title} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm text-blue-600 hover:underline"> اضغط للتحدث مع مساعدك الذكي</a>
                  ) : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا يوجد مساعد ذكي.</p>}

            {/* كتب وملخصات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary"><FileText size={18} /><span className="mr-2">الملخصات والكتب</span></h4>
            {subject.content?.summaries?.length > 0 ? (
              <>
                <Select onValueChange={setSelectedSummaryId}>
                  <SelectTrigger><SelectValue placeholder="اختر ملخصا او كتاب " /></SelectTrigger>
                  <SelectContent>
                    {subject.content.summaries.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.url}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const summary = subject.content.summaries.find(i => i.id === selectedSummaryId);
                  return summary ? (
                    <a href={summary.title} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm text-blue-600 hover:underline">فتح ملخص او كتاب</a>
                  ) : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا توجد كتب او ملخصات</p>}

            {/* الاختبارات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary"><ClipboardCheck size={18} /><span className="mr-2">الاختبارات</span></h4>
            {subject.content?.exams?.length > 0 ? (
              <>
                <Select onValueChange={setSelectedExamId}>
                  <SelectTrigger><SelectValue placeholder="اختر اختباراً" /></SelectTrigger>
                  <SelectContent>
                    {subject.content.exams.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.url}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const exam = subject.content.exams.find(i => i.id === selectedExamId);
                  return exam ? (
                    <a href={exam.title} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm text-blue-600 hover:underline">فتح الاختبار</a>
                  ) : null;
                })()}
              </>
            ) : <p className="text-sm text-muted-foreground">لا توجد اختبارات.</p>}

            {/* الفيديوهات */}
            <h4 className="flex items-center text-md font-semibold my-2 text-primary"><Film size={18} /><span className="mr-2">شروحات الفيديو</span></h4>
            {subject.content?.youtube?.length > 0 ? (
              <>
                <Select onValueChange={setSelectedVideoId}>
                  <SelectTrigger><SelectValue placeholder="اختر فيديو" /></SelectTrigger>
                  <SelectContent>
                    {subject.content.youtube.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.url}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(() => {
                  const video = subject.content.youtube.find(i => i.id === selectedVideoId);
                  const embedUrl = video ? getYouTubeEmbedUrl(video.title) : null;
                  return embedUrl ? (
                    <div className="mt-2">
                      <p className="font-semibold mb-1">{video.url}</p>
                      <div className="aspect-video overflow-hidden rounded-lg border">
                        <iframe src={embedUrl} width="100%" height="315" title={video.url} frameBorder="0" allowFullScreen></iframe>
                      </div>
                    </div>
                  ) : <p className="text-muted-foreground text-sm mt-2">اختر فيديو من القائمة لعرضه.</p>;
                })()}
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
            <CardHeader><CardTitle>المواد الدراسية</CardTitle></CardHeader>
            <CardContent>
              {studentStage?.semesterSystem === 'two-semesters' ? (
                <Tabs defaultValue="semester1">
                  <TabsList>
                    <TabsTrigger value="semester1">الفصل الأول</TabsTrigger>
                    <TabsTrigger value="semester2">الفصل الثاني</TabsTrigger>
                  </TabsList>
                  <TabsContent value="semester1">{renderSubjectsAccordion(subjects.semesterOneSubjects)}</TabsContent>
                  <TabsContent value="semester2">{renderSubjectsAccordion(subjects.semesterTwoSubjects)}</TabsContent>
                </Tabs>
              ) : (
                renderSubjectsAccordion(subjects.semesterOneSubjects)
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center"><Video className="mr-2 text-primary" /> الغرف الافتراضية</CardTitle>
              <CardDescription>روابط الحصص الأونلاين المباشرة.</CardDescription>
            </CardHeader>
            <CardContent>
              {onlineRooms.length > 0 ? (
                <div className="space-y-3">
                  {onlineRooms.map(room => (
                    <a key={room.id} href={room.url} target="_blank" rel="noopener noreferrer">
                      <motion.div whileHover={{ scale: 1.05 }} className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer">
                        <p className="font-bold text-primary">{room.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          انقر للانضمام<ExternalLink size={14} className="ml-2 rtl:ml-0 rtl:mr-2" />
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
    </div>
  );
};

export default StudentDashboardPage;
