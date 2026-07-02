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
              className="border border-gray-100 rounded-xl mb-3 sm:mb-4 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md data-[state=open]:border-primary/20 data-[state=open]:shadow-md"
            >
              <AccordionTrigger 
                disabled={isHidden}
                className={`
                  text-base sm:text-xl font-bold flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4
                  ${isHidden ? 'opacity-60 cursor-not-allowed' : 'hover:text-primary transition-colors'}
                `}
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-md ${isHidden ? 'bg-gray-100' : 'bg-primary/10 text-primary'}`}>
                    <Book size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="truncate text-right">{subject.name}</span>
                  {isHidden && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0 bg-gray-200">
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
                    <div className="flex items-center gap-2 mb-4 sm:mb-6 bg-green-50 p-3 rounded-lg border border-green-100">
                      <div className="p-1.5 bg-green-200 rounded-full">
                        <Eye className="w-4 h-4 text-green-700" />
                      </div>
                      <span className="text-sm font-bold text-green-800 flex-1">
                        مادة مفعلة
                      </span>
                      <Badge variant="outline" className="bg-white text-xs sm:text-sm">
                        المعلم: {subject.teacherName || 'غير محدد'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* اسال المساعد الذكي */}
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 hover:shadow-md transition-shadow">
                        <h4 className="flex items-center text-base font-bold mb-3 text-purple-700">
                          <div className="p-1.5 bg-purple-100 rounded-md mr-2 ml-0 rtl:ml-2 rtl:mr-0">
                            <Brain size={18} />
                          </div>
                          المساعد الذكي
                        </h4>
                        {subject.content?.textbooks?.length > 0 ? (
                          <div className="space-y-3">
                            <Select onValueChange={(value) => setSelectedBook({ subjectId: subject.id, bookId: value })}>
                              <SelectTrigger className="w-full bg-white border-purple-200 focus:ring-purple-500">
                                <SelectValue placeholder="اختر مساعدك" />
                              </SelectTrigger>
                              <SelectContent>
                                {subject.content.textbooks.map(item => (
                                  <SelectItem key={item.id} value={item.id}>{item.title || `مساعد ${subject.name}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedBook.subjectId === subject.id && (() => {
                              const book = subject.content.textbooks.find(i => i.id === selectedBook.bookId);
                              return book ? renderResourceButton(book, 'textbooks') : null;
                            })()}
                          </div>
                        ) : <p className="text-sm text-gray-500 bg-white/50 p-2 rounded text-center">لا يوجد مساعد ذكي.</p>}
                      </div>

                      {/* كتب وملخصات */}
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow">
                        <h4 className="flex items-center text-base font-bold mb-3 text-blue-700">
                          <div className="p-1.5 bg-blue-100 rounded-md mr-2 ml-0 rtl:ml-2 rtl:mr-0">
                            <FileText size={18} />
                          </div>
                          الملخصات والكتب
                        </h4>
                        {subject.content?.summaries?.length > 0 ? (
                          <div className="space-y-3">
                            <Select onValueChange={(value) => setSelectedSummary({ subjectId: subject.id, summaryId: value })}>
                              <SelectTrigger className="w-full bg-white border-blue-200 focus:ring-blue-500">
                                <SelectValue placeholder="اختر ملخصا أو كتاب" />
                              </SelectTrigger>
                              <SelectContent>
                                {subject.content.summaries.map(item => (
                                  <SelectItem key={item.id} value={item.id}>{item.title || `ملخص ${subject.name}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedSummary.subjectId === subject.id && (() => {
                              const summary = subject.content.summaries.find(i => i.id === selectedSummary.summaryId);
                              return summary ? renderResourceButton(summary, 'summaries') : null;
                            })()}
                          </div>
                        ) : <p className="text-sm text-gray-500 bg-white/50 p-2 rounded text-center">لا توجد كتب أو ملخصات</p>}
                      </div>

                      {/* الاختبارات */}
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 hover:shadow-md transition-shadow">
                        <h4 className="flex items-center text-base font-bold mb-3 text-orange-700">
                          <div className="p-1.5 bg-orange-100 rounded-md mr-2 ml-0 rtl:ml-2 rtl:mr-0">
                            <ClipboardCheck size={18} />
                          </div>
                          الاختبارات
                        </h4>
                        {subject.content?.exams?.length > 0 ? (
                          <div className="space-y-3">
                            <Select onValueChange={(value) => setSelectedExam({ subjectId: subject.id, examId: value })}>
                              <SelectTrigger className="w-full bg-white border-orange-200 focus:ring-orange-500">
                                <SelectValue placeholder="اختر اختباراً" />
                              </SelectTrigger>
                              <SelectContent>
                                {subject.content.exams.map(item => (
                                  <SelectItem key={item.id} value={item.id}>{item.title || `اختبار ${subject.name}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedExam.subjectId === subject.id && (() => {
                              const exam = subject.content.exams.find(i => i.id === selectedExam.examId);
                              return exam ? renderResourceButton(exam, 'exams') : null;
                            })()}
                          </div>
                        ) : <p className="text-sm text-gray-500 bg-white/50 p-2 rounded text-center">لا توجد اختبارات.</p>}
                      </div>

                      {/* الفيديوهات */}
                      <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 hover:shadow-md transition-shadow">
                        <h4 className="flex items-center text-base font-bold mb-3 text-red-700">
                          <div className="p-1.5 bg-red-100 rounded-md mr-2 ml-0 rtl:ml-2 rtl:mr-0">
                            <Film size={18} />
                          </div>
                          شروحات الفيديو
                        </h4>
                        {subject.content?.youtube?.length > 0 ? (
                          <div className="space-y-3">
                            <Select onValueChange={(value) => handleVideoSelect(value, subject.id, subject.content.youtube)}>
                              <SelectTrigger className="w-full bg-white border-red-200 focus:ring-red-500">
                                <SelectValue placeholder="اختر من القائمة" />
                              </SelectTrigger>
                              <SelectContent>
                                {subject.content.youtube.map((item, index) => (
                                  <SelectItem key={item.id} value={item.id}>{item.title || `الفيديو ${index + 1}`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {/* زر تشغيل الفيديو - يظهر لأي فيديو مختار */}
                            {currentVideo && selectedVideo.subjectId === subject.id && selectedVideo.videoId && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-3 p-3 border border-red-200 rounded-lg bg-white shadow-sm"
                              >
                                <p className="font-semibold mb-2 text-center text-gray-800 text-xs sm:text-sm line-clamp-1">
                                  {currentVideo.title}
                                </p>
                                {renderResourceButton({ url: currentVideo.url, title: currentVideo.title }, 'youtube')}
                              </motion.div>
                            )}
                          </div>
                        ) : <p className="text-sm text-gray-500 bg-white/50 p-2 rounded text-center">لا توجد فيديوهات.</p>}
                      </div>
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
  // مكون الغرف الافتراضية للشريط الجانبي
  const VirtualRoomsCard = () => (
    <Card className="shadow-xl h-fit border-0 bg-gradient-to-b from-white to-gray-50/50 sticky top-24 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500"></div>
      <CardHeader className="p-4 sm:p-6 pb-2">
        <CardTitle className="flex items-center text-lg sm:text-xl font-bold">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-100 mr-2 ml-0 rtl:ml-2 rtl:mr-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
            <Video className="text-red-600 relative z-10" size={16} />
          </div>
          البث المباشر
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm font-medium mt-1">حصص أونلاين متاحة الآن</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-2">
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
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
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
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] relative overflow-hidden">
      {/* شبكة خلفية هندسية (Geometric pattern) */}
      <div className="absolute inset-0 z-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#475569 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      
      {/* دوائر إضاءة ناعمة (Soft Glows) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[120px] z-0 pointer-events-none"></div>

      <div className="container mx-auto p-3 sm:p-4 md:p-6 relative z-10">
        {/* الهيدر */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6 sm:mb-8 md:mb-10"
      >
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent rounded-2xl p-6 sm:p-8 mb-6 border border-primary/20 shadow-sm relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 sm:p-3 bg-primary/20 rounded-xl text-primary">
                  <Book size={28} className="sm:w-10 sm:h-10" />
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                  مرحباً بك، <span className="text-primary">{user?.name || 'طالب'}</span>
                </h1>
              </div>
              <p className="text-muted-foreground text-base sm:text-lg md:text-xl pr-2 sm:pr-16 flex flex-wrap items-center gap-2 mt-3 font-medium">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/30 text-sm py-1">
                  {studentStage?.name || "المرحلة غير محددة"}
                </Badge>
                <span>ابدأ رحلة التعلم الخاصة بك اليوم!</span>
              </p>
            </div>
            
            {/* زر الغرف الافتراضية للجوال */}
            {isMobile && (
              <Button 
                variant="default" 
                onClick={() => setShowMobileRooms(!showMobileRooms)}
                className="w-full sm:w-auto shadow-md"
              >
                <Video className="h-4 w-4 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                الغرف الافتراضية المباشرة
              </Button>
            )}
          </div>
        </div>
        
        {/* إحصائيات المواد */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-md hover:shadow-lg transition-all overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">إجمالي المواد</p>
                  <p className="text-3xl font-extrabold text-gray-800">{subjectsStats.total}</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-full group-hover:scale-110 transition-transform text-blue-600">
                  <Book size={28} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-gradient-to-br from-green-50 to-white border-green-100 shadow-md hover:shadow-lg transition-all overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">المواد المفعلة</p>
                  <p className="text-3xl font-extrabold text-gray-800">{subjectsStats.active}</p>
                </div>
                <div className="p-4 bg-green-100 rounded-full group-hover:scale-110 transition-transform text-green-600">
                  <Eye size={28} />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-md hover:shadow-lg transition-all overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">المواد المقفلة</p>
                  <p className="text-3xl font-extrabold text-gray-800">{subjectsStats.hidden}</p>
                </div>
                <div className="p-4 bg-orange-100 rounded-full group-hover:scale-110 transition-transform text-orange-600">
                  <Lock size={28} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 gap-4 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Book size={24} />
                </div>
                <CardTitle className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">المواد الدراسية</CardTitle>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm self-start sm:self-auto">
                <Button
                  variant={showAllSubjects ? "default" : "ghost"}
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setShowAllSubjects(!showAllSubjects)}
                  className={`flex items-center gap-1 text-xs sm:text-sm font-semibold transition-all ${showAllSubjects ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                  الكل
                </Button>
                <Button
                  variant={!showAllSubjects ? "default" : "ghost"}
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setShowAllSubjects(false)}
                  className={`flex items-center gap-1 text-xs sm:text-sm font-semibold transition-all ${!showAllSubjects ? 'shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  المفعلة
                  <Badge variant={!showAllSubjects ? "secondary" : "outline"} className="ml-1 px-1.5 py-0 text-[10px] sm:text-xs">
                    {subjectsStats.active}
                  </Badge>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {studentStage?.semesterSystem === 'two-semesters' ? (
                <Tabs defaultValue="semester1" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-6 bg-gray-100/50 p-1 rounded-xl">
                    <TabsTrigger value="semester1" className="text-sm sm:text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2">
                      الفصل الأول 
                      <Badge variant="outline" className="mr-1 sm:mr-2 text-xs bg-gray-50">
                        {showAllSubjects 
                          ? subjects.semesterOneSubjects.length 
                          : filteredSubjects.semesterOneSubjects.length
                        }
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="semester2" className="text-sm sm:text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg py-2">
                      الفصل الثاني
                      <Badge variant="outline" className="mr-1 sm:mr-2 text-xs bg-gray-50">
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
    </div>
  );
};

export default StudentDashboardPage;