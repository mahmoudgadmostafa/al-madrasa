
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getFirestore, collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, ArrowLeft, Users, PlusCircle, MoreVertical, Edit, Trash2, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const ChatPage = () => {
    const { user } = useAuth();
    const { chatId } = useParams();
    const navigate = useNavigate();
    const db = getFirestore();
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [loadingChats, setLoadingChats] = useState(true);
    const unreadCount = chats.filter(c => c.isUnread).length;
    const [loadingMessages, setLoadingMessages] = useState(false);
    const messagesEndRef = useRef(null);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [potentialContacts, setPotentialContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editedMessageText, setEditedMessageText] = useState('');

    const getDashboardLink = () => {
        if (!user) return "/login";
        switch (user.role) {
          case 'admin': return '/admin';
          case 'teacher': return '/teacher';
          case 'student': return '/student';
          default: return '/login';
        }
    };

    useEffect(() => {
        if (!user) return;
        setLoadingChats(true);
        const chatsQuery = user.role === 'admin'
            ? query(collection(db, 'chats'), orderBy('lastMessage.timestamp', 'desc'))
            : query(collection(db, 'chats'), where('participants', 'array-contains', user.uid), orderBy('lastMessage.timestamp', 'desc'));

        const unsubscribe = onSnapshot(chatsQuery, async (querySnapshot) => {
            const chatsData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                const otherParticipantId = data.participants.find(p => p !== user.uid);
                
                let participantDetails = data.participantDetails;
                if (!participantDetails) {
                    const participantPromises = data.participants.map(id => getDoc(doc(db, 'users', id)));
                    const participantDocs = await Promise.all(participantPromises);
                    participantDetails = {};
                    participantDocs.forEach(pDoc => {
                        if(pDoc.exists()) participantDetails[pDoc.id] = { name: pDoc.data().name, role: pDoc.data().role };
                    });
                }

                const otherParticipant = otherParticipantId ? (participantDetails[otherParticipantId] || { name: 'مستخدم غير معروف' }) : { name: 'محادثة ذاتية'};
                
                const isUnread = data.lastMessage && data.lastMessage.senderId !== user.uid && (!data.readBy || !data.readBy.includes(user.uid));

                return { ...data, id: docSnapshot.id, otherParticipant, participantDetails, isUnread };
            }));
            setChats(chatsData);
            setLoadingChats(false);
        }, (error) => {
            console.error("Error fetching chats:", error);
            toast({ title: "خطأ", description: "فشل تحميل المحادثات.", variant: "destructive" });
            setLoadingChats(false);
        });
        return () => unsubscribe();
    }, [db, user]);

    useEffect(() => {
        if (chatId) {
            const chat = chats.find(c => c.id === chatId);
            setActiveChat(chat);
            setLoadingMessages(true);
            const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
            const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
                setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingMessages(false);
            }, (error) => {
                console.error("Error fetching messages:", error);
                setLoadingMessages(false);
            });
            
            markChatAsRead(chatId);

            return () => unsubscribe();
        } else {
            setActiveChat(null);
            setMessages([]);
        }
    }, [chatId, chats, db]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const markChatAsRead = async (chatIdToMark) => {
        if (!user || !chatIdToMark) return;
        const chatRef = doc(db, 'chats', chatIdToMark);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            const readBy = chatData.readBy || [];
            if (!readBy.includes(user.uid)) {
                await updateDoc(chatRef, { readBy: [...readBy, user.uid] });
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !activeChat) return;
        const messageText = newMessage;
        setNewMessage('');

        await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
            text: messageText,
            senderId: user.uid,
            timestamp: serverTimestamp(),
            senderName: user.name,
        });
        await setDoc(doc(db, 'chats', activeChat.id), {
            lastMessage: { text: messageText, timestamp: new Date(), senderId: user.uid },
            readBy: [user.uid]
        }, { merge: true });
    };

    const handleSelectChat = (chat) => {
        navigate(`/chat/${chat.id}`);
    };

    const fetchPotentialContacts = async () => {
        if (!user) return;
        let q;
        if (user.role === 'admin') q = query(collection(db, 'users'), where('role', 'in', ['teacher', 'student']));
        else if (user.role === 'teacher') q = query(collection(db, 'users'), where('role', 'in', ['admin', 'student']));
        else q = query(collection(db, 'users'), where('role', 'in', ['admin', 'teacher']));
        
        const snapshot = await getDocs(q);
        const contacts = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.id !== user.uid);
        setPotentialContacts(contacts);
    };

    const handleCreateNewChat = async () => {
        if (!selectedContact) return;
        const existingChat = chats.find(c => c.participants.includes(selectedContact) && c.participants.includes(user.uid));
        if (existingChat) {
            navigate(`/chat/${existingChat.id}`);
            setIsNewChatModalOpen(false);
            return;
        }

        const contactDoc = await getDoc(doc(db, 'users', selectedContact));
        if(!contactDoc.exists()) return;
        const contactData = contactDoc.data();

        const newChatRef = await addDoc(collection(db, 'chats'), {
            participants: [user.uid, selectedContact],
            participantDetails: {
                [user.uid]: { name: user.name, role: user.role },
                [selectedContact]: { name: contactData.name, role: contactData.role }
            },
            createdAt: serverTimestamp(),
            lastMessage: { text: "المحادثة بدأت للتو.", timestamp: new Date(), senderId: user.uid },
            readBy: [user.uid]
        });
        navigate(`/chat/${newChatRef.id}`);
        setIsNewChatModalOpen(false);
    };

    const handleDeleteMessage = async (chatId, messageId) => {
        if(window.confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً؟')) {
            try {
                await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
                toast({ title: 'نجاح', description: 'تم حذف الرسالة.' });
            } catch (error) {
                toast({ title: 'خطأ', description: 'فشل حذف الرسالة.', variant: 'destructive' });
            }
        }
    };

    const openEditModal = (message) => {
        setEditingMessage(message);
        setEditedMessageText(message.text);
        setIsEditModalOpen(true);
    };

    const handleUpdateMessage = async () => {
        if (!editingMessage || !editedMessageText.trim()) return;
        try {
            await updateDoc(doc(db, 'chats', activeChat.id, 'messages', editingMessage.id), {
                text: editedMessageText,
                edited: true
            });
            toast({ title: 'نجاح', description: 'تم تعديل الرسالة.' });
            setIsEditModalOpen(false);
            setEditingMessage(null);
        } catch (error) {
            toast({ title: 'خطأ', description: 'فشل تعديل الرسالة.', variant: 'destructive' });
        }
    };

    const renderChatName = (chat) => {
        if (!chat) return '';
        if (user.role === 'admin') {
            return Object.values(chat.participantDetails || {}).map(p => p.name).join(' - ') || 'محادثة';
        }
        return chat.otherParticipant?.name || 'مستخدم';
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="relative">
                           <MessageSquare className="w-8 h-8 text-primary" />
                              {unreadCount > 0 && (
                                 <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                                     {unreadCount}
                                            </span>
                                              )}
                                               </div>
                        <h1 className="text-3xl font-bold text-foreground">مركز الرسائل</h1>
                    </div>
                    <Button variant="outline" onClick={() => navigate(getDashboardLink())}>
                        <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                        العودة إلى لوحة التحكم
                    </Button>
                </div>
                <p className="text-muted-foreground">تواصل مع المعلمين والطلاب والمديرين.</p>
            </motion.div>

            <Card className="h-[calc(100vh-14rem)] flex flex-row shadow-lg border rounded-lg">
                <aside className={`w-full md:w-1/3 lg:w-1/4 border-l rtl:border-r rtl:border-l-0 p-2 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex justify-between items-center p-2 mb-2">
                        <h2 className="text-xl font-bold">المحادثات</h2>
                        <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={fetchPotentialContacts}><PlusCircle /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>بدء محادثة جديدة</DialogTitle></DialogHeader>
                                <Select onValueChange={setSelectedContact}>
                                    <SelectTrigger><SelectValue placeholder="اختر جهة اتصال..." /></SelectTrigger>
                                    <SelectContent>
                                        {potentialContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.role})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <DialogFooter><Button onClick={handleCreateNewChat}>بدء المحادثة</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {loadingChats ? <p className="text-center p-4">جاري التحميل...</p> : chats.map(chat => (
                            <div key={chat.id} className={`flex items-center justify-between p-3 cursor-pointer rounded-lg mb-1 ${activeChat?.id === chat.id ? 'bg-primary/10' : 'hover:bg-muted'}`}>

                             <div className="flex items-center" onClick={() => handleSelectChat(chat)}>
                             <Avatar className="ml-3 rtl:mr-3"><AvatarFallback>{renderChatName(chat).charAt(0)}</AvatarFallback></Avatar>
                           <div>
                         <p className="font-semibold">{renderChatName(chat)}</p>
                         <p className="text-sm text-muted-foreground truncate">{chat.lastMessage?.text}</p>
                      </div>
                       </div>
                  <div className="flex items-center gap-1">
                    {chat.isUnread && <Badge variant="destructive" className="w-3 h-3 p-0 rounded-full" />}
        <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreVertical size={16} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
                          onClick={async () => {
                           const confirm = window.confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟');
                            if (!confirm) return;
                             const msgs = await getDocs(collection(db, 'chats', chat.id, 'messages'));
                              await Promise.all(msgs.docs.map(m => deleteDoc(m.ref)));
                                 await deleteDoc(doc(db, 'chats', chat.id));
                                 toast({ title: 'تم الحذف', description: 'تم حذف المحادثة.' });
                                 if (chat.id === chatId) navigate('/chat');
                                }}
                              className="text-destructive"
                              >
                                حذف المحادثة
                                     </DropdownMenuItem>
                                  </DropdownMenuContent>
                                 </DropdownMenu>
                                  </div>
                                    </div>

                        ))}
                    </div>
                </aside>

                <main className={`flex-grow flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <>
                            <header className="flex items-center p-3 border-b">
                                <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => navigate('/chat')}><ArrowLeft /></Button>
                                <Avatar className="ml-3 rtl:mr-3"><AvatarFallback>{renderChatName(activeChat).charAt(0)}</AvatarFallback></Avatar>
                                <div><h3 className="font-bold">{renderChatName(activeChat)}</h3></div>
                            </header>
                            <div className="flex-grow p-4 overflow-y-auto bg-muted/20">
                                {loadingMessages ? <p>جاري تحميل الرسائل...</p> : messages.map(msg => (
                                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 mb-4 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                        {msg.senderId !== user.uid && <Avatar className="h-8 w-8"><AvatarFallback>{msg.senderName?.charAt(0) || 'U'}</AvatarFallback></Avatar>}
                                        <div className={`group relative max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border rounded-bl-none'}`}>
                                            <p>{msg.text}</p>
                                            <p className={`text-xs mt-1 ${msg.senderId === user.uid ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                {msg.timestamp?.toDate().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                {msg.edited && <span> (تم التعديل)</span>}
                                            </p>
                                        </div>
                                        {user.role === 'admin' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical size={16} /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => openEditModal(msg)}><Edit className="h-4 w-4 ml-2" /> تعديل</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteMessage(activeChat.id, msg.id)} className="text-destructive"><Trash2 className="h-4 w-4 ml-2" /> حذف</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <footer className="p-3 border-t bg-background">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="اكتب رسالتك..." autoComplete="off" />
                                    <Button type="submit" size="icon"><Send /></Button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Users size={64} className="mb-4" />
                            <h2 className="text-xl font-semibold">مرحباً بك في مركز الرسائل</h2>
                            <p>اختر محادثة من القائمة أو ابدأ واحدة جديدة.</p>
                        </div>
                    )}
                </main>
            </Card>

            {isEditModalOpen && (
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>تعديل الرسالة</DialogTitle></DialogHeader>
                        <Textarea value={editedMessageText} onChange={(e) => setEditedMessageText(e.target.value)} rows={4} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>إلغاء</Button>
                            <Button onClick={handleUpdateMessage}>حفظ التعديل</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default ChatPage;
