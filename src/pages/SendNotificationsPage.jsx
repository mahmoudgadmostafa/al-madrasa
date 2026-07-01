import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Send, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SendNotificationsPage = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [recipientGroup, setRecipientGroup] = useState('all');
    const [educationalStages, setEducationalStages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const { user } = useAuth();
    const db = getFirestore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStages = async () => {
            const settingsRef = doc(db, "system_config", "school_system_settings");
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                setEducationalStages(docSnap.data().educationalStages || []);
            }
        };
        fetchStages();
    }, [db]);

    const handleSendNotification = async () => {
        if (!title.trim() || !message.trim()) {
            toast({
                title: "بيانات ناقصة",
                description: "الرجاء إدخال عنوان ورسالة للإشعار.",
                variant: "destructive",
            });
            return;
        }
        setIsSending(true);
        try {
            await addDoc(collection(db, "notifications"), {
                title,
                message,
                senderId: user.uid,
                senderName: user.name,
                recipients: [recipientGroup],
                timestamp: serverTimestamp(),
                readBy: [],
            });
            toast({
                title: "تم الإرسال بنجاح!",
                description: "تم إرسال الإشعار إلى المستلمين المحددين.",
            });
            setTitle('');
            setMessage('');
            setRecipientGroup('all');
        } catch (error) {
            console.error("Error sending notification: ", error);
            toast({
                title: "خطأ في الإرسال",
                description: "حدث خطأ أثناء إرسال الإشعار. يرجى المحاولة مرة أخرى.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <Send className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">إرسال إشعار جديد</h1>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/admin')}><ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />العودة إلى لوحة التحكم</Button>
                </div>
                <p className="text-muted-foreground">أرسل إعلانات وتنبيهات للمستخدمين في النظام.</p>
            </motion.div>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">عنوان الإشعار</Label>
                            <Input id="title" placeholder="مثال: اجتماع أولياء الأمور" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">نص الرسالة</Label>
                            <Textarea id="message" placeholder="اكتب تفاصيل الإشعار هنا..." value={message} onChange={(e) => setMessage(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="recipients">إرسال إلى</Label>
                            <Select value={recipientGroup} onValueChange={setRecipientGroup}>
                                <SelectTrigger id="recipients">
                                    <SelectValue placeholder="اختر المستلمين" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">الجميع</SelectItem>
                                    <SelectItem value="teacher">المعلمين فقط</SelectItem>
                                    <SelectItem value="student">الطلاب فقط</SelectItem>
                                    {educationalStages.map(stage => (
                                        <SelectItem key={stage.id} value={stage.id}>طلاب {stage.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSendNotification} disabled={isSending}>
                        {isSending ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground"></div> : <Send className="mr-2 ml-0 h-4 w-4" />}
                        <span className="ml-2 rtl:mr-2">إرسال الإشعار</span>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SendNotificationsPage;