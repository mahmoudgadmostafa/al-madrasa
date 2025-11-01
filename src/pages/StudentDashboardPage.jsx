import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Book, Film, Video, ExternalLink, FileText, ClipboardCheck, Play, Filter, Eye, Lock, Brain, TestTube } from 'lucide-react';
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
  const [showMobileRooms, setShowMobileRooms] = useState(false);

  const db = getFirestore();
  const studentStage = schoolSettings?.educationalStages?.find(s => s.id === user?.stageId);

  // كاش لحجم الشاشة
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!user?.uid || !user?.stageId) {
      setLoadingData(false);
      return;
    }

    let unsubscribeUser = () => {};
    let unsubscribeCurriculum = () => {};
    let unsubscribeRooms = () => {};

    try {
      // جلب المواد النشطة للطالب من Firebase
      const userRef = doc(db, "users", user.uid);
      unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setActiveSubjects(Array.isArray(userData.activeSubjects) ? userData.activeSubjects : []);
        }
      });

      const curriculumRef = doc(db, "curriculum", user.stageId);
      unsubscribeCurriculum = onSnapshot(curriculumRef, (docSnap) => {
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
      unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
        const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOnlineRooms(fetchedRooms);
      });

    } catch (error) {
      console.error("Error in useEffect:", error);
      setLoadingData(false);
    }

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
    if (!url) return null;
    
    try {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting YouTube URL:", error);
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
    if (currentVideo?.url) {
      setVideoDialogOpen(true);
    } else {
      toast({
        title: "تنبيه",
        description: "يرجى اختيار فيديو أولاً",
        variant: "destructive"
      });
    }
  };

  // دالة لفتح المساعد الذكي
  const openAIAssistant = (resource) => {
    if (!resource?.url) {
      toast({
        title: "خطأ",
        description: "لا يوجد رابط للمساعد الذكي",
        variant: "destructive"
      });
      return;
    }
    
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  // دالة لفتح الملخص أو الكتاب
  const openSummary = (resource) => {
    if (!resource?.url) {
      toast({
        title: "خطأ",
        description: "لا يوجد رابط للملخص أو الكتاب",
        variant: "destructive"
      });
      return;
    }
    
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  // دالة لفتح الاختبار
  const openExam = (resource) => {
    if (!resource?.url) {
      toast({
        title: "خطأ",
        description: "لا يوجد رابط للاختبار",
        variant: "destructive"
      });
      return;
    }
    
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const renderResourceButton = (resource, type) => {
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
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 mt-2 w-full sm:w-auto text-white"
            size={isMobile ? "sm" : "default"}
          >
            <Play size={isMobile ? 14 : 16} />
            <span className="text-xs sm:text-sm">تشغيل الفيديو</span>
          </Button>
        );
      }
    }
    
    // تحديد النص والأيقونة حسب نوع المورد
    let buttonText = "";
    let buttonIcon = null;
    let buttonClass = "flex items-center gap-2 mt-2 w-full sm:w-auto text-white";
    
    switch(type) {
      case 'textbooks':
        buttonText = "التحدث مع المساعد الذكي";
        buttonIcon = <Brain size={isMobile ? 14 : 16} />;
        buttonClass += " bg-purple-600 hover:bg-purple-700";
        break;
      case 'summaries':
        buttonText = "فتح الملخص أو الكتاب";
        buttonIcon = <FileText size={isMobile ? 14 : 16} />;
        buttonClass += " bg-blue-600 hover:bg-blue-700";
        break;
      case 'exams':
        buttonText = "اختبر نفسك";
        buttonIcon = <TestTube size={isMobile ? 14 : 16} />;
        buttonClass += " bg-orange-600 hover:bg-orange-700";
        break;
      default:
        buttonText = "فتح الرابط";
        buttonIcon = <ExternalLink size={isMobile ? 14 : 16} />;
        buttonClass += " bg-gray-600 hover:bg-gray-700";
    }
    
    return (
      <Button 
        onClick={() => {
          switch(type) {
            case 'textbooks':
              openAIAssistant(resource);
              break;
            case 'summaries':
              openSummary(resource);
              break;
            case 'exams':
              openExam(resource);
              break;
            default:
              if (resource.url) {
                window.open(resource.url, '_blank', 'noopener,noreferrer');
              }
          }
        }}
        className={buttonClass}
        size={isMobile ? "sm" : "default"}
      >
        {buttonIcon}
        <span className="text-xs sm:text-sm">{buttonText}</span>
      </Button>
    );
  };

  const renderSubjectsAccordion = (subjectList, semester) => (
    <Accordion type="single" collapsible className="w-full">
      {subjectList && subjectList.length > 0 ? (
        subjectList.map(subject => {
          const isActive = activeSubjects.includes(subject.id);
          const isHidden = !isActive;

          return (
            <AccordionItem 
              key={subject.id} 
              value={subject.id}
            >
              <AccordionTrigger 
                disabled={isHidden}
                className={`
                  text-sm sm:text-lg flex items-center justify-between px-2 sm:px-4
                  ${isHidden ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <span className="truncate text-right">{subject.name}</span>
                  {isHidden && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      مخفي
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                  {isHidden ? (
                    <>
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground hidden sm:inline">مقفولة</span>
                    </>
                  ) : (
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  )}
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-2 sm:px-4">
                {!isHidden ? (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                        <Eye className="w-2 h-2 sm:w-3 sm:h-3 ml-1" />
                        مادة مفعلة
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        المعلم: {subject.teacherName || 'غير محدد'}
                      </span>
                    </div>

                    {/* اسال المساعد الذكي */}
                    <div className="mb-3 sm:mb-4">
                      <h4 className="flex items-center text-sm sm:text-md font-semibold my-2 text-primary">
                        <Book size={isMobile ? 16 : 18} />
                        <span className="mr-1 sm:mr-2 text-xs sm:text-sm">اسال مساعدك الذكي</span>
                      </h4>
                      {subject.content?.textbooks?.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          <Select onValueChange={(value) => {
                            setSelectedBook({ subjectId: subject.id, bookId: value });
                          }}>
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="اختر مساعدك" />
                            </SelectTrigger>
                            <SelectContent>
                              {subject.content.textbooks.map(item => (
                                <SelectItem key={item.id} value={item.id} className="text-xs sm:text-sm">
                                  {item.title || `مساعد ${subject.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedBook.subjectId === subject.id && (() => {
                            const book = subject.content.textbooks.find(i => i.id === selectedBook.bookId);
                            return book ? (
                              <div className="flex justify-center sm:justify-start">
                                {renderResourceButton(book, 'textbooks')}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : <p className="text-xs sm:text-sm text-muted-foreground">لا يوجد مساعد ذكي.</p>}
                    </div>

                    {/* كتب وملخصات */}
                    <div className="mb-3 sm:mb-4">
                      <h4 className="flex items-center text-sm sm:text-md font-semibold my-2 text-primary">
                        <FileText size={isMobile ? 16 : 18} />
                        <span className="mr-1 sm:mr-2 text-xs sm:text-sm">الملخصات والكتب</span>
                      </h4>
                      {subject.content?.summaries?.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          <Select onValueChange={(value) => {
                            setSelectedSummary({ subjectId: subject.id, summaryId: value });
                          }}>
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="اختر ملخصا او كتاب" />
                            </SelectTrigger>
                            <SelectContent>
                              {subject.content.summaries.map(item => (
                                <SelectItem key={item.id} value={item.id} className="text-xs sm:text-sm">
                                  {item.title || `ملخص ${subject.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedSummary.subjectId === subject.id && (() => {
                            const summary = subject.content.summaries.find(i => i.id === selectedSummary.summaryId);
                            return summary ? (
                              <div className="flex justify-center sm:justify-start">
                                {renderResourceButton(summary, 'summaries')}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : <p className="text-xs sm:text-sm text-muted-foreground">لا توجد كتب او ملخصات</p>}
                    </div>

                    {/* الاختبارات */}
                    <div className="mb-3 sm:mb-4">
                      <h4 className="flex items-center text-sm sm:text-md font-semibold my-2 text-primary">
                        <ClipboardCheck size={isMobile ? 16 : 18} />
                        <span className="mr-1 sm:mr-2 text-xs sm:text-sm">الاختبارات</span>
                      </h4>
                      {subject.content?.exams?.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          <Select onValueChange={(value) => {
                            setSelectedExam({ subjectId: subject.id, examId: value });
                          }}>
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="اختر اختباراً" />
                            </SelectTrigger>
                            <SelectContent>
                              {subject.content.exams.map(item => (
                                <SelectItem key={item.id} value={item.id} className="text-xs sm:text-sm">
                                  {item.title || `اختبار ${subject.name}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedExam.subjectId === subject.id && (() => {
                            const exam = subject.content.exams.find(i => i.id === selectedExam.examId);
                            return exam ? (
                              <div className="flex justify-center sm:justify-start">
                                {renderResourceButton(exam, 'exams')}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : <p className="text-xs sm:text-sm text-muted-foreground">لا توجد اختبارات.</p>}
                    </div>

                    {/* الفيديوهات */}
                    <div className="mb-3 sm:mb-4">
                      <h4 className="flex items-center text-sm sm:text-md font-semibold my-2 text-primary">
                        <Film size={isMobile ? 16 : 18} />
                        <span className="mr-1 sm:mr-2 text-xs sm:text-sm">شروحات الفيديو</span>
                      </h4>
                      {subject.content?.youtube?.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs sm:text-sm text-blue-800 text-center font-medium">
                              📹 اختر فيديو الشرح من القائمة
                            </p>
                          </div>
                          
                          <Select 
                            onValueChange={(value) => {
                              handleVideoSelect(value, subject.id, subject.content.youtube);
                            }}
                          >
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="اختر من القائمة" />
                            </SelectTrigger>
                            <SelectContent>
                              {subject.content.youtube.map((item, index) => (
                                <SelectItem key={item.id} value={item.id} className="text-xs sm:text-sm">
                                  {item.title || `الفيديو ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* زر تشغيل الفيديو - يظهر لأي فيديو مختار */}
                          {currentVideo && selectedVideo.subjectId === subject.id && selectedVideo.videoId && (
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 border rounded-lg bg-gray-50">
                              <p className="font-semibold mb-2 sm:mb-3 text-center text-gray-800 text-xs sm:text-sm">
                                {currentVideo.title}
                              </p>
                              <div className="flex justify-center">
                                {renderResourceButton(
                                  { url: currentVideo.url, title: currentVideo.title }, 
                                  'youtube'
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : <p className="text-xs sm:text-sm text-muted-foreground">لا توجد فيديوهات.</p>}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 sm:py-6 bg-gray-50 rounded-lg border border-gray-200">
                    <Lock className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-600 font-medium text-sm sm:text-base">هذه المادة غير مفعلة حالياً</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      لا يمكنك الوصول إلى محتوى هذه المادة حتى يتم تفعيلها
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })
      ) : (
        <div className="text-center py-6 sm:py-8">
          <p className="text-muted-foreground text-sm sm:text-base">
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
              size={isMobile ? "sm" : "default"}
            >
              عرض جميع المواد
            </Button>
          )}
        </div>
      )}
    </Accordion>
  );

  // مكون الغرف الافتراضية للشريط الجانبي
  const VirtualRoomsCard = () => (
    <Card className="shadow-lg h-fit">
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center text-lg sm:text-xl">
          <Video className="mr-2 text-primary" size={isMobile ? 18 : 20} /> 
          الغرف الافتراضية
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">روابط الحصص الأونلاين المباشرة.</CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        {onlineRooms.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {onlineRooms.map(room => (
              <a 
                key={room.id} 
                href={room.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <motion.div 
                  whileHover={{ scale: 1.02 }} 
                  className="p-3 sm:p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <p className="font-bold text-primary text-sm sm:text-base">{room.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center">
                    انقر للانضمام
                    <ExternalLink size={isMobile ? 12 : 14} className="ml-2" />
                  </p>
                </motion.div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground p-3 sm:p-4 text-xs sm:text-sm">
            لا توجد غرف افتراضية متاحة حالياً.
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6">
      {/* الهيدر */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-4 sm:mb-6 md:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              لوحة تحكم الطالب
            </h1>
            {/* زر الغرف الافتراضية للجوال */}
            {isMobile && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMobileRooms(!showMobileRooms)}
                className="ml-4"
              >
                <Video className="h-4 w-4" />
                الغرف
              </Button>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-sm sm:text-lg font-bold text-red-600">
              مرحباً بك، {user?.name || 'طالب'}
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              المرحلة التعليمية: {studentStage?.name || "غير محددة"}
            </p>
          </div>
        </div>

        <p className="text-center text-base sm:text-xl font-bold text-primary my-3 sm:my-4">
          هنا تجد موادك الدراسية والمحتوى التعليمي
        </p>
        
        {/* إحصائيات المواد */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{subjectsStats.total}</p>
              <p className="text-xs sm:text-sm text-blue-800">إجمالي المواد</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{subjectsStats.active}</p>
              <p className="text-xs sm:text-sm text-green-800">المواد المفعلة</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-orange-600">{subjectsStats.hidden}</p>
              <p className="text-xs sm:text-sm text-orange-800">المواد المخفية</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* عرض الغرف الافتراضية على الجوال */}
      {isMobile && showMobileRooms && (
        <div className="mb-4">
          <VirtualRoomsCard />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* المحتوى الرئيسي */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">المواد الدراسية</CardTitle>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant={showAllSubjects ? "default" : "outline"}
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setShowAllSubjects(!showAllSubjects)}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                  {showAllSubjects ? "المواد المفعلة فقط" : "عرض جميع المواد"}
                </Button>
                <Badge variant="secondary" className="text-xs">
                  {showAllSubjects ? subjectsStats.total : subjectsStats.active} / {subjectsStats.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {studentStage?.semesterSystem === 'two-semesters' ? (
                <Tabs defaultValue="semester1" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-4">
                    <TabsTrigger value="semester1" className="text-xs sm:text-sm">
                      الفصل الأول 
                      <Badge variant="secondary" className="mr-1 sm:mr-2 text-xs">
                        {showAllSubjects 
                          ? subjects.semesterOneSubjects.length 
                          : filteredSubjects.semesterOneSubjects.length
                        }
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="semester2" className="text-xs sm:text-sm">
                      الفصل الثاني
                      <Badge variant="secondary" className="mr-1 sm:mr-2 text-xs">
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

        {/* الشريط الجانبي - يظهر فقط على الشاشات المتوسطة والكبيرة */}
        {!isMobile && (
          <div className="lg:col-span-1">
            <VirtualRoomsCard />
          </div>
        )}
      </div>

      {/* Dialog لعرض الفيديو */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full mx-2 sm:mx-4 md:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base md:text-lg">
              {currentVideo?.title || 'فيديو تعليمي'}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            {currentVideo && (
              <iframe 
                src={currentVideo.url} 
                width="100%" 
                height="100%" 
                title={currentVideo.title}
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="min-h-[200px] sm:min-h-[300px] md:min-h-[400px]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboardPage;