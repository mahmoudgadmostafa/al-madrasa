import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { BookCopy, PlusCircle, Trash2, Save, ArrowLeft, FilePlus, Book, Film, Link as LinkIcon, FileText, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
    const [newLinks, setNewLinks] = useState({
        textbooks: { title: '', url: '' },
        summaries: { title: '', url: '' },
        youtube: { title: '', url: '' },
        exams: { title: '', url: '' },
    });

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
                toast({ title: "خطأ فادح", description: "فشل تحميل بيانات الصفحة.", variant: "destructive" });
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
            const subjects = stageCurriculum[semester] || [];
            return {
                ...prev,
                [stageId]: { ...stageCurriculum, [semester]: [...subjects, newSubject] }
            };
        });
    };

    const handleRemoveSubject = (stageId, semester, subjectIndex) => {
        setCurriculums(prev => {
            const stageCurriculum = prev[stageId] || {};
            const subjects = (stageCurriculum[semester] || []).filter((_, index) => index !== subjectIndex);
            return {
                ...prev,
                [stageId]: { ...stageCurriculum, [semester]: subjects }
            };
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
                    name: s.name,
                    teacherId: s.teacherId || '',
                    teacherName: s.teacherName || '',
                    content: s.content || { textbooks: [], summaries: [], youtube: [], exams: [] }
                }));
            }

            const curriculumRef = doc(db, "curriculum", stageId);
            await setDoc(curriculumRef, curriculumToSave, { merge: true });
            
            toast({ title: "نجاح!", description: `تم حفظ المناهج للمرحلة بنجاح.` });
        } catch (error) {
            console.error("Error saving curriculum:", error);
            toast({ title: "خطأ فادح عند الحفظ", description: `فشل حفظ المنهج الدراسي. الخطأ: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const openContentModal = (subject, stageId, semester) => {
        setSelectedSubject({ ...subject, stageId, semester });
        setCurrentContent(subject.content || { textbooks: [], summaries: [], youtube: [], exams: [] });
        setIsContentModalOpen(true);
    };

    const handleNewLinkChange = (type, field, value) => {
        setNewLinks(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
    };

    const handleAddLink = (type) => {
        const linkData = newLinks[type];
        if (!linkData.url.trim() || !linkData.title.trim()) {
            toast({ title: "خطأ", description: "الرجاء إدخال العنوان والرابط.", variant: "destructive" });
            return;
        }
        setCurrentContent(prev => ({ ...prev, [type]: [...(prev[type] || []), { id: `new_${Date.now()}`, ...linkData }] }));
        setNewLinks(prev => ({ ...prev, [type]: { title: '', url: '' } }));
    };

    const handleRemoveLink = (type, index) => {
        setCurrentContent(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, i) => i !== index) }));
    };

    const saveContentChanges = async () => {
        if (!selectedSubject) return;
        setIsSaving(true);
        try {
            const { stageId, semester, id: subjectId } = selectedSubject;
            const stageCurriculum = curriculums[stageId] || {};
            const subjects = stageCurriculum[semester] || [];
            const updatedSubjects = subjects.map(s => s.id === subjectId ? { ...s, content: currentContent } : s);

            const curriculumRef = doc(db, "curriculum", stageId);
            await setDoc(curriculumRef, { [semester]: updatedSubjects }, { merge: true });
            
            toast({ title: "نجاح", description: "تم حفظ المحتوى التعليمي بنجاح." });
            setIsContentModalOpen(false);
            setSelectedSubject(null);
        } catch (error) {
            console.error("Error saving content:", error);
            toast({ title: "خطأ", description: "فشل حفظ المحتوى.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const renderSemesterSubjects = (stageId, semester, title) => (
        <Card className="border-none shadow-none">
            <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
                {(curriculums[stageId]?.[semester] || []).map((subject, index) => (
                    <div key={subject.id || index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center p-3 border rounded-lg">
                        <Input placeholder="اسم المادة" value={subject.name} onChange={e => handleSubjectChange(stageId, semester, index, 'name', e.target.value)} className="md:col-span-2" />
                        <Select value={subject.teacherId || 'unassigned'} onValueChange={v => handleSubjectChange(stageId, semester, index, 'teacherId', v === 'unassigned' ? '' : v)}>
                            <SelectTrigger><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned"><em>بدون معلم</em></SelectItem>
                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => openContentModal(subject, stageId, semester)}><FilePlus className="h-4 w-4 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />إدارة المحتوى</Button>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveSubject(stageId, semester, index)}><Trash2 size={16} /></Button>
                    </div>
                ))}
                <Button onClick={() => handleAddSubject(stageId, semester)} variant="outline" className="w-full"><PlusCircle className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> إضافة مادة جديدة</Button>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div></div>;
    }

    const validStages = educationalStages.filter(stage => stage && typeof stage.id === 'string' && stage.id.trim() !== '');

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <BookCopy className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">إدارة المناهج الدراسية</h1>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/admin')}><ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />العودة إلى لوحة التحكم</Button>
                </div>
                <p className="text-muted-foreground">أدر المواد الدراسية والمحتوى التعليمي لكل مرحلة وفصل دراسي.</p>
            </motion.div>
            
            {validStages.length > 0 ? (
                <Accordion type="single" collapsible className="w-full" defaultValue={validStages[0]?.id}>
                    {validStages.map(stage => (
                       <AccordionItem key={stage.id} value={stage.id}>
                            <AccordionTrigger className="text-xl font-semibold">{stage.name}</AccordionTrigger>
                            <AccordionContent>
                                {stage.semesterSystem === 'two-semesters' ? (
                                    <Tabs defaultValue="semester1" className="w-full">
                                        <TabsList>
                                            <TabsTrigger value="semester1">الفصل الدراسي الأول</TabsTrigger>
                                            <TabsTrigger value="semester2">الفصل الدراسي الثاني</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="semester1">{renderSemesterSubjects(stage.id, 'semesterOneSubjects', 'منهج الفصل الدراسي الأول')}</TabsContent>
                                        <TabsContent value="semester2">{renderSemesterSubjects(stage.id, 'semesterTwoSubjects', 'منهج الفصل الدراسي الثاني')}</TabsContent>
                                    </Tabs>
                                ) : (
                                    renderSemesterSubjects(stage.id, 'semesterOneSubjects', 'منهج الفصل الدراسي الواحد')
                                )}
                                <CardFooter className="mt-4">
                                    <Button onClick={() => handleSaveChanges(stage.id)} disabled={isSaving}>
                                        {isSaving ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground"></div> : <Save className="mr-2 ml-0 h-4 w-4" />}
                                        <span className="ml-2 rtl:mr-2">حفظ تغييرات المرحلة</span>
                                    </Button>
                                </CardFooter>
                            </AccordionContent>
                       </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <Card className="text-center p-8"><CardTitle>لا توجد مراحل دراسية</CardTitle><CardDescription className="mt-2">اذهب إلى <Button variant="link" onClick={() => navigate('/admin/settings')}>إعدادات النظام</Button> لإضافة مراحل.</CardDescription></Card>
            )}

            <AnimatePresence>
                {isContentModalOpen && selectedSubject && (
                    <Dialog open={isContentModalOpen} onOpenChange={setIsContentModalOpen}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>إدارة محتوى: {selectedSubject.name}</DialogTitle>
                                <DialogDescription>أضف روابط الكتب، الملخصات، الاختبارات، والفيديوهات لهذه المادة.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {[
                                    {type: 'textbooks', title: 'رابط المساعد الذكي ', icon: <Book/>}, 
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
                                <Button onClick={saveContentChanges} disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : 'حفظ المحتوى'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageCurriculumPage;
