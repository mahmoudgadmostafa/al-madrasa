import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Book, Film, Video, ExternalLink, FileText, ClipboardCheck, Play, Filter, Eye, EyeOff, Lock } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";

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
  const [activeSubjects, setActiveSubjects] = useState([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const db = getFirestore();

  const studentStage = schoolSettings.educationalStages.find(s => s.id === user?.stageId);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingData(false);
      return;
    }

    // جلب المواد النشطة للطالب من Firebase
    const userRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setActiveSubjects(Array.isArray(userData.activeSubjects) ? userData.activeSubjects : []);
      }
    });

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
      unsubscribeUser();
      unsubscribeCurriculum();
      unsubscribeRooms();
    };
  }, [db, user?.uid, user?.stageId]);

  // فلترة المواد بناءً على المواد النشطة
  const filteredSubjects = useMemo(() => {
    if (showAllSubjects) {
      return subjects;
    }

    const filterSubjectList = (subjectList) => {
      return subjectList.filter(subject => 
        activeSubjects.includes(subject.id)
      );
    };

    return {
      semesterOneSubjects: filterSubjectList(subjects.semesterOneSubjects),
      semesterTwoSubjects: filterSubjectList(subjects.semesterTwoSubjects)
    };
  }, [subjects, activeSubjects, showAllSubjects]);

  // إحصائيات المواد
  const subjectsStats = useMemo(() => {
    const totalSubjects = subjects.semesterOneSubjects.length + subjects.semesterTwoSubjects.length;
    const activeCount = activeSubjects.length;
    
    return {
      total: totalSubjects,
      active: activeCount,
      hidden: totalSubjects - activeCount
    };
  }, [subjects, activeSubjects]);

  const getYouTubeEmbedUrl = (url) => {
    try {
      if (!url) return null;
      let videoId;
      
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      
      if (match && match[1]) {
        videoId = match[1];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
      } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
      } else if (url.includes('/embed/')) {
        videoId = url.split('/embed/')[1]?.split('?')[0];
      } else if (url.includes('/shorts/')) {
        videoId = url.split('/shorts/')[1]?.split('?')[0];
      }
      
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch (error) {
      console.error("❌ خطأ في استخراج رابط اليوتيوب:", error);
      return null;
    }
  };

  const handleVideoSelect = (videoId, subjectId, videoList) => {
    if (!videoId) {
      setCurrentVideo(null);
      setSelectedVideo({ subjectId: null, videoId: null });
      return;
    }
    
    const video = videoList.find(i => i.id === videoId);
    
    if (video) {
      setSelectedVideo({ subjectId, videoId });
      const embedUrl = getYouTubeEmbedUrl(video.url);
      
      if (embedUrl) {
        setCurrentVideo({
          url: embedUrl,
          title: video.title || `فيديو ${subjectId}`
        });
      } else {
        setCurrentVideo(null);
      }
    } else {
      setCurrentVideo(null);
    }
  };

  const openVideoDialog = () => {
    if (currentVideo) {
      setVideoDialogOpen(true);
    } else {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار فيديو أولاً",
        variant: "destructive"
      });
    }
  };

  const renderResourceLink = (resource, type) => {
    if (!resource) return null;
    
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
      {subjectList.length > 0 ? (
        subjectList.map(subject => {
          const isActive = activeSubjects.includes(subject.id);
          const isHidden = !isActive;

          return (
            <AccordionItem 
              key={subject.id} 
              value={subject.id}
              disabled={isHidden}
            >
              <AccordionTrigger className={`
                text-lg flex items-center justify-between
                ${isHidden ? 'opacity-60 cursor-not-allowed' : ''}
              `}>
                <div className="flex items-center gap-2">
                  <span>{subject.name}</span>
                  {isHidden && (
                    <Badge variant="secondary" className="text-xs">
                      مخفي
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isHidden ? (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">مقفولة</span>
                    </>
                  ) : (
                    <Eye className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </AccordionTrigger>
              
              {!isHidden && (
                <AccordionContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Eye className="w-3 h-3 ml-1" />
                      مادة مفعلة
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      المعلم: {subject.teacherName || 'غير محدد'}
                    </span>
                  </div>

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
                              {item.title || `مساعد ${subject.name}`}
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
                              {item.title || `ملخص ${subject.name}`}
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
                              {item.title || `اختبار ${subject.name}`}
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
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 text-center font-medium">
                          📹 اختر فيديو الشرح من القائمة
                        </p>
                      </div>
                      
                      <Select 
                        onValueChange={(value) => {
                          handleVideoSelect(value, subject.id, subject.content.youtube);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر من القائمة" />
                        </SelectTrigger>
                        <SelectContent>
                          {subject.content.youtube.map((item, index) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.title || `الفيديو ${index + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* زر تشغيل الفيديو - يظهر لأي فيديو مختار */}
                      {currentVideo && selectedVideo.subjectId === subject.id && selectedVideo.videoId && (
                        <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                          <p className="font-semibold mb-3 text-center text-gray-800">
                            {currentVideo.title}
                          </p>
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

                      {/* رسالة عندما لا يوجد فيديو محدد */}
                      {(!currentVideo || selectedVideo.subjectId !== subject.id) && (
                        <div className="mt-4 p-4 border border-dashed rounded-lg bg-gray-50 text-center">
                          <Film className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            اختر فيديو من القائمة لعرضه وتشغيله
                          </p>
                        </div>
                      )}
                    </>
                  ) : <p className="text-sm text-muted-foreground">لا توجد فيديوهات.</p>}
                </AccordionContent>
              )}

              {/* رسالة للمواد المخفية */}
              {isHidden && (
                <AccordionContent>
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">هذه المادة غير مفعلة حالياً</p>
                    <p className="text-sm text-gray-500 mt-1">
                      لا يمكنك الوصول إلى محتوى هذه المادة حتى يتم تفعيلها
                    </p>
                  </div>
                </AccordionContent>
              )}
            </AccordionItem>
          );
        })
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {showAllSubjects 
              ? "لا توجد مواد في هذا الفصل" 
              : "لا توجد مواد مفعلة في هذا الفصل"
            }
          </p>
          {!showAllSubjects && subjects.semesterOneSubjects.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setShowAllSubjects(true)}
              className="mt-2"
            >
              عرض جميع المواد
            </Button>
          )}
        </div>
      )}
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
        
        {/* إحصائيات المواد */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{subjectsStats.total}</p>
              <p className="text-sm text-blue-800">إجمالي المواد</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{subjectsStats.active}</p>
              <p className="text-sm text-green-800">المواد المفعلة</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{subjectsStats.hidden}</p>
              <p className="text-sm text-orange-800">المواد المخفية</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>المواد الدراسية</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={showAllSubjects ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllSubjects(!showAllSubjects)}
                  className="flex items-center gap-1"
                >
                  <Filter className="w-4 h-4" />
                  {showAllSubjects ? "عرض جميع المواد" : "المواد المفعلة فقط"}
                </Button>
                <Badge variant="secondary" className="text-sm">
                  {showAllSubjects ? subjectsStats.total : subjectsStats.active} / {subjectsStats.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {studentStage?.semesterSystem === 'two-semesters' ? (
                <Tabs defaultValue="semester1">
                  <TabsList>
                    <TabsTrigger value="semester1">
                      الفصل الأول 
                      <Badge variant="secondary" className="mr-2 text-xs">
                        {showAllSubjects 
                          ? subjects.semesterOneSubjects.length 
                          : filteredSubjects.semesterOneSubjects.length
                        }
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="semester2">
                      الفصل الثاني
                      <Badge variant="secondary" className="mr-2 text-xs">
                        {showAllSubjects 
                          ? subjects.semesterTwoSubjects.length 
                          : filteredSubjects.semesterTwoSubjects.length
                        }
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="semester1">
                    {renderSubjectsAccordion(
                      showAllSubjects ? subjects.semesterOneSubjects : filteredSubjects.semesterOneSubjects,
                      'semester1'
                    )}
                  </TabsContent>
                  <TabsContent value="semester2">
                    {renderSubjectsAccordion(
                      showAllSubjects ? subjects.semesterTwoSubjects : filteredSubjects.semesterTwoSubjects,
                      'semester2'
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                renderSubjectsAccordion(
                  showAllSubjects ? subjects.semesterOneSubjects : filteredSubjects.semesterOneSubjects,
                  'single'
                )
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
            <DialogTitle>{currentVideo?.title || 'فيديو تعليمي'}</DialogTitle>
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
