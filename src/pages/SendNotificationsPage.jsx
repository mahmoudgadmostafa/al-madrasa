import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Send, ArrowLeft, Bell, Users, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SendNotificationsPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientGroup, setRecipientGroup] = useState('all');
  const [educationalStages, setEducationalStages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const { user } = useAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStages = async () => {
      const settingsRef = doc(db, "system_config", "school_system_settings");
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) setEducationalStages(docSnap.data().educationalStages || []);
    };
    fetchStages();
  }, [db]);

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "بيانات ناقصة", description: "الرجاء إدخال عنوان ورسالة للإشعار.", variant: "destructive" });
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
      setSentCount(prev => prev + 1);
      toast({ title: "✅ تم الإرسال بنجاح!", description: "تم إرسال الإشعار إلى المستلمين المحددين." });
      setTitle('');
      setMessage('');
      setRecipientGroup('all');
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({ title: "خطأ في الإرسال", description: "حدث خطأ أثناء إرسال الإشعار.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const recipientOptions = [
    { value: 'all', label: 'الجميع', icon: Users, desc: 'جميع مستخدمي النظام' },
    { value: 'teacher', label: 'المعلمون فقط', icon: BookOpen, desc: 'جميع المعلمين المسجلين' },
    { value: 'student', label: 'الطلاب فقط', icon: Users, desc: 'جميع الطلاب المسجلين' },
  ];

  const getRecipientLabel = (value) => {
    const opt = recipientOptions.find(o => o.value === value);
    if (opt) return opt.label;
    const stage = educationalStages.find(s => s.id === value);
    return stage ? `طلاب ${stage.name}` : value;
  };

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #4a044e 30%, #1e3a5f 60%, #0f172a 100%)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #d946ef, transparent)' }}></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-3xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #d946ef, #a855f7)' }}>
                <Bell className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">إرسال إشعار</h1>
                <p className="text-fuchsia-300 text-sm mt-1">إرسال إعلانات وتنبيهات للمستخدمين</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-fuchsia-200 border border-fuchsia-500/30 hover:bg-fuchsia-500/10 transition-all duration-200 self-start sm:self-auto">
              <ArrowLeft className="w-4 h-4" /> العودة
            </button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'إشعارات مرسلة', value: sentCount, color: '#d946ef' },
            { label: 'المراحل المتاحة', value: educationalStages.length, color: '#a855f7' },
            { label: 'مجموعات الاستهداف', value: 3 + educationalStages.length, color: '#ec4899' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-3 border border-fuchsia-500/20 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <p className="font-bold text-xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-fuchsia-300 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Main Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-fuchsia-500/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
          <div className="px-6 py-4 border-b border-fuchsia-500/20" style={{ background: 'rgba(217,70,239,0.1)' }}>
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-lg font-semibold text-white">تفاصيل الإشعار</h2>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-fuchsia-200 text-sm font-medium flex items-center gap-2">
                <Bell className="w-4 h-4" /> عنوان الإشعار
              </Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اجتماع أولياء الأمور"
                className="w-full px-4 py-3 rounded-xl border border-fuchsia-500/30 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-fuchsia-200 text-sm font-medium">نص الرسالة</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل الإشعار هنا... يمكنك ذكر التاريخ والوقت والمكان وأي تفاصيل مهمة."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-fuchsia-500/30 text-white placeholder-fuchsia-400/50 focus:outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20 transition-all duration-200 resize-none"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              />
              <p className="text-xs text-fuchsia-400/60 text-left">{message.length} حرف</p>
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <Label className="text-fuchsia-200 text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> إرسال إلى
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {recipientOptions.map((option) => (
                  <button key={option.value} onClick={() => setRecipientGroup(option.value)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all duration-200"
                    style={{
                      background: recipientGroup === option.value ? 'rgba(217,70,239,0.2)' : 'rgba(255,255,255,0.04)',
                      borderColor: recipientGroup === option.value ? 'rgba(217,70,239,0.6)' : 'rgba(217,70,239,0.15)',
                      transform: recipientGroup === option.value ? 'scale(1.02)' : 'scale(1)',
                    }}>
                    <option.icon className="w-5 h-5" style={{ color: recipientGroup === option.value ? '#d946ef' : '#a855f7' }} />
                    <span className="text-xs font-medium" style={{ color: recipientGroup === option.value ? '#f0abfc' : '#c084fc' }}>{option.label}</span>
                  </button>
                ))}
              </div>

              {educationalStages.length > 0 && (
                <Select value={!['all', 'teacher', 'student'].includes(recipientGroup) ? recipientGroup : ''} onValueChange={(v) => v && setRecipientGroup(v)}>
                  <SelectTrigger className="border-fuchsia-500/30 text-fuchsia-200" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <SelectValue placeholder="أو اختر مرحلة دراسية محددة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {educationalStages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>طلاب {stage.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Recipient Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(217,70,239,0.1)', border: '1px solid rgba(217,70,239,0.2)' }}>
                <CheckCircle2 className="w-4 h-4 text-fuchsia-400 shrink-0" />
                <span className="text-fuchsia-200">سيتم الإرسال إلى: <strong className="text-white">{getRecipientLabel(recipientGroup)}</strong></span>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="px-6 py-5 border-t border-fuchsia-500/20" style={{ background: 'rgba(0,0,0,0.1)' }}>
            <button
              onClick={handleSendNotification}
              disabled={isSending || !title.trim() || !message.trim()}
              className="w-full py-4 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-3 shadow-lg hover:shadow-fuchsia-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: isSending ? 'rgba(217,70,239,0.5)' : 'linear-gradient(135deg, #d946ef, #a855f7)' }}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>إرسال الإشعار</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 p-4 rounded-xl border border-fuchsia-500/15" style={{ background: 'rgba(217,70,239,0.05)' }}>
          <p className="text-fuchsia-300 text-xs text-center">
            💡 نصيحة: تأكد من وضوح الرسالة وتحديد المستلمين بدقة قبل الإرسال. الإشعارات تصل فوراً لجميع المستخدمين المحددين.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SendNotificationsPage;