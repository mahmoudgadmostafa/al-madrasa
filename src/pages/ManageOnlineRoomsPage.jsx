import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Video, PlusCircle, Trash2, Edit, Save, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

const ManageOnlineRoomsPage = () => {
    const [educationalStages, setEducationalStages] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomData, setRoomData] = useState({ name: '', url: '', stageId: '' });

    const db = getFirestore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPrerequisites = async () => {
            try {
                const settingsRef = doc(db, "system_config", "school_system_settings");
                const settingsSnap = await getDoc(settingsRef);
                const stages = settingsSnap.exists() ? settingsSnap.data().educationalStages || [] : [];
                setEducationalStages(stages);
            } catch (error) {
                console.error("Error fetching stages:", error);
                toast({ title: "خطأ", description: "فشل تحميل المراحل الدراسية.", variant: "destructive" });
            }
        };

        fetchPrerequisites();

        const roomsQuery = query(collection(db, "online_classrooms"), orderBy("name"));
        const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRooms(fetchedRooms);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching rooms:", error);
            toast({ title: "خطأ", description: "فشل تحميل الغرف الافتراضية.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    const handleOpenModal = (room = null) => {
        setCurrentRoom(room);
        if (room) {
            setRoomData({ name: room.name, url: room.url, stageId: room.stageId });
        } else {
            setRoomData({ name: '', url: '', stageId: '' });
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (field, value) => {
        setRoomData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!roomData.name || !roomData.url || !roomData.stageId) {
            toast({ title: "بيانات ناقصة", description: "الرجاء ملء جميع الحقول.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            if (currentRoom) {
                await updateDoc(doc(db, "online_classrooms", currentRoom.id), roomData);
                toast({ title: "نجاح", description: "تم تحديث الغرفة بنجاح." });
            } else {
                await addDoc(collection(db, "online_classrooms"), roomData);
                toast({ title: "نجاح", description: "تمت إضافة الغرفة بنجاح." });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error submitting room:", error);
            toast({ title: "خطأ", description: "فشل حفظ بيانات الغرفة.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (roomId) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الغرفة؟")) return;
        try {
            await deleteDoc(doc(db, "online_classrooms", roomId));
            toast({ title: "نجاح", description: "تم حذف الغرفة بنجاح." });
        } catch (error) {
            console.error("Error deleting room:", error);
            toast({ title: "خطأ", description: "فشل حذف الغرفة.", variant: "destructive" });
        }
    };

    const getStageName = (stageId) => educationalStages.find(s => s.id === stageId)?.name || "غير محدد";

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <Video className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">إدارة الغرف الافتراضية</h1>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/admin')}><ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />العودة إلى لوحة التحكم</Button>
                </div>
                <p className="text-muted-foreground">أدر روابط الحصص الأونلاين (مثل Zoom أو Teams) لكل مرحلة دراسية.</p>
            </motion.div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>قائمة الغرف</CardTitle>
                            <CardDescription>جميع الغرف الافتراضية المتاحة في النظام.</CardDescription>
                        </div>
                        <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> إضافة غرفة جديدة</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
                    ) : rooms.length === 0 ? (
                        <p className="text-center text-muted-foreground p-8">لا توجد غرف افتراضية بعد. ابدأ بإضافة واحدة!</p>
                    ) : (
                        <div className="space-y-4">
                            {rooms.map(room => (
                                <motion.div
                                    key={room.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                                >
                                    <div>
                                        <p className="font-bold text-primary">{room.name}</p>
                                        <p className="text-sm text-muted-foreground">المرحلة: {getStageName(room.stageId)}</p>
                                        <a href={room.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">{room.url}</a>
                                    </div>
                                    <div className="flex space-x-2 rtl:space-x-reverse">
                                        <Button variant="outline" size="icon" onClick={() => handleOpenModal(room)}><Edit size={16} /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDelete(room.id)}><Trash2 size={16} /></Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AnimatePresence>
                {isModalOpen && (
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{currentRoom ? 'تعديل الغرفة' : 'إضافة غرفة جديدة'}</DialogTitle>
                                <DialogDescription>املأ التفاصيل أدناه لحفظ الغرفة الافتراضية.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <Input placeholder="اسم الغرفة (مثال: حصة الرياضيات)" value={roomData.name} onChange={e => handleFormChange('name', e.target.value)} required />
                                <Input type="url" placeholder="رابط الغرفة (URL)" value={roomData.url} onChange={e => handleFormChange('url', e.target.value)} required />
                                <Select value={roomData.stageId} onValueChange={value => handleFormChange('stageId', value)} required>
                                    <SelectTrigger><SelectValue placeholder="اختر المرحلة الدراسية" /></SelectTrigger>
                                    <SelectContent>
                                        {educationalStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">إلغاء</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground"></div> : <Save className="mr-2 ml-0 h-4 w-4" />}
                                        <span className="ml-2 rtl:mr-2">حفظ</span>
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageOnlineRoomsPage;