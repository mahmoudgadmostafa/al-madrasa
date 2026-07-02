import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "@/components/ui/use-toast";
import { Video, PlusCircle, Trash2, Edit, Save, X, ArrowLeft, Link as LinkIcon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFirestore, collection, onSnapshot, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

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
    setRoomData(room ? { name: room.name, url: room.url, stageId: room.stageId } : { name: '', url: '', stageId: '' });
    setIsModalOpen(true);
  };

  const handleFormChange = (field, value) => setRoomData(prev => ({ ...prev, [field]: value }));

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
        toast({ title: "✅ تم التحديث", description: "تم تحديث الغرفة بنجاح." });
      } else {
        await addDoc(collection(db, "online_classrooms"), roomData);
        toast({ title: "✅ تمت الإضافة", description: "تمت إضافة الغرفة بنجاح." });
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ بيانات الغرفة.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (roomId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الغرفة؟")) return;
    try {
      await deleteDoc(doc(db, "online_classrooms", roomId));
      toast({ title: "تم الحذف", description: "تم حذف الغرفة بنجاح." });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الغرفة.", variant: "destructive" });
    }
  };

  const getStageName = (stageId) => educationalStages.find(s => s.id === stageId)?.name || "غير محدد";

  const roomsByStage = educationalStages.map(stage => ({
    ...stage,
    rooms: rooms.filter(r => r.stageId === stage.id)
  }));

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #450a0a 30%, #1e1b4b 60%, #0f172a 100%)' }}>
      {/* Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #ef4444, transparent)' }}></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #dc2626, transparent)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #f87171, transparent)' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <Video className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">الغرف الافتراضية</h1>
                <p className="text-red-300 text-sm mt-1">إدارة روابط الحصص الأونلاين لكل مرحلة دراسية</p>
              </div>
            </div>
            <div className="flex gap-3 self-start sm:self-auto">
              <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-200 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200">
                <ArrowLeft className="w-4 h-4" /> العودة
              </button>
              <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold shadow-lg hover:shadow-red-500/30 hover:scale-105 active:scale-95 transition-all duration-200" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                <PlusCircle className="w-4 h-4" /> إضافة غرفة
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'إجمالي الغرف', value: rooms.length, color: '#ef4444' },
            { label: 'المراحل الدراسية', value: educationalStages.length, color: '#dc2626' },
            { label: 'غرف نشطة', value: rooms.length, color: '#f87171' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 border border-red-500/20 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
              <p className="font-bold text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-red-300 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-red-300">جاري تحميل الغرف...</p>
          </div>
        ) : rooms.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 rounded-2xl border border-red-500/20" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <Video className="w-16 h-16 text-red-400/40 mx-auto mb-4" />
            <p className="text-red-200 text-xl font-semibold mb-2">لا توجد غرف افتراضية</p>
            <p className="text-red-400/60 text-sm mb-4">ابدأ بإضافة غرفة افتراضية جديدة</p>
            <button onClick={() => handleOpenModal()} className="px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              إضافة أول غرفة
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {roomsByStage.filter(s => s.rooms.length > 0).map((stage, stageIndex) => (
                <motion.div key={stage.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stageIndex * 0.05 }}>
                  <h3 className="text-red-300 font-semibold text-sm mb-3 flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> {stage.name}
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{stage.rooms.length}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stage.rooms.map(room => (
                      <motion.div key={room.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-2xl border border-red-500/20 group hover:border-red-500/40 transition-all duration-200" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                              <Video className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{room.name}</p>
                              <p className="text-red-300 text-xs">{getStageName(room.stageId)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => handleOpenModal(room)} className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(room.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <a href={room.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-300 hover:text-white hover:bg-red-500/15 transition-all duration-150 group/link"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <LinkIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{room.url}</span>
                        </a>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Rooms without stage */}
            {rooms.filter(r => !educationalStages.some(s => s.id === r.stageId)).length > 0 && (
              <div>
                <h3 className="text-red-300/60 font-semibold text-sm mb-3">غرف غير مصنفة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rooms.filter(r => !educationalStages.some(s => s.id === r.stageId)).map(room => (
                    <div key={room.id} className="p-4 rounded-2xl border border-red-500/20 group hover:border-red-500/40 transition-all duration-200" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-white text-sm">{room.name}</p>
                          <p className="text-red-400/60 text-xs">غير محدد المرحلة</p>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(room)} className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(room.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <a href={room.url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline truncate block">{room.url}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, #0f172a, #450a0a)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                      <Video className="w-4 h-4 text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      {currentRoom ? 'تعديل الغرفة' : 'إضافة غرفة جديدة'}
                    </h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { field: 'name', placeholder: 'اسم الغرفة (مثال: حصة الرياضيات)', label: 'اسم الغرفة' },
                    { field: 'url', placeholder: 'رابط الغرفة (URL)', label: 'رابط الغرفة', type: 'url' },
                  ].map((f, i) => (
                    <div key={i} className="space-y-1.5">
                      <label className="text-red-200 text-sm">{f.label}</label>
                      <input type={f.type || 'text'} placeholder={f.placeholder} value={roomData[f.field]} onChange={e => handleFormChange(f.field, e.target.value)} required
                        className="w-full px-3 py-2.5 rounded-xl border border-red-500/30 text-white placeholder-red-400/40 focus:outline-none focus:border-red-400 text-sm transition-all"
                        style={{ background: 'rgba(255,255,255,0.07)' }} />
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <label className="text-red-200 text-sm">المرحلة الدراسية</label>
                    <Select value={roomData.stageId} onValueChange={value => handleFormChange('stageId', value)} required>
                      <SelectTrigger className="border-red-500/30 text-white" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <SelectValue placeholder="اختر المرحلة الدراسية" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationalStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-200 hover:bg-red-500/10 transition-all text-sm font-medium">إلغاء</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 hover:opacity-90 transition-all"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                      {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                      حفظ
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageOnlineRoomsPage;