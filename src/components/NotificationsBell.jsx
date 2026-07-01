
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { toast } from "@/components/ui/use-toast";

const NotificationsBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const db = getFirestore();

  useEffect(() => {
    if (!user || !user.role) return;

    let userGroups = ['all', user.role];
    if (user.stageId) {
      userGroups.push(user.stageId);
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipients', 'array-contains-any', userGroups),
      orderBy('timestamp', 'desc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(fetchedNotifications);
      
      const count = fetchedNotifications.filter(n => !n.readBy || !n.readBy.includes(user.uid)).length;
      setUnreadCount(count);
    }, (error) => {
        console.error("Error fetching notifications: ", error);
        toast({ title: "خطأ", description: "فشل تحميل الإشعارات.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [db, user]);

  const handleMarkAsRead = async (notificationId) => {
    if (!user || !user.uid) return;
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && (!notification.readBy || !notification.readBy.includes(user.uid))) {
          const updatedReadBy = notification.readBy ? [...notification.readBy, user.uid] : [user.uid];
          await updateDoc(notificationRef, { readBy: updatedReadBy });
        }
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
  };

  const handleReadAll = async () => {
    if (!user || !user.uid || unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notification => {
      if (!notification.readBy || !notification.readBy.includes(user.uid)) {
        const notificationRef = doc(db, 'notifications', notification.id);
        const updatedReadBy = notification.readBy ? [...notification.readBy, user.uid] : [user.uid];
        batch.update(notificationRef, { readBy: updatedReadBy });
      }
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };
  
  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    if (!user || user.role !== 'admin') return;
    if (window.confirm("هل أنت متأكد من حذف هذا الإشعار للجميع؟")) {
        try {
            await deleteDoc(doc(db, 'notifications', notificationId));
            toast({ title: "تم الحذف", description: "تم حذف الإشعار بنجاح." });
        } catch (err) {
            console.error("Error deleting notification: ", err);
            toast({ title: "خطأ", description: "فشل حذف الإشعار.", variant: "destructive" });
        }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadCount}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>الإشعارات</span>
            {unreadCount > 0 && <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleReadAll}>تعليم الكل كمقروء</Button>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map(notification => {
                const isUnread = !notification.readBy || !notification.readBy.includes(user.uid);
                return (
                  <div key={notification.id} className={`relative flex items-center justify-between hover:bg-muted/50 rounded-md ${isUnread ? 'bg-primary/10' : ''}`}>
                    <div className="flex-grow p-2 cursor-pointer" onClick={() => handleMarkAsRead(notification.id)}>
                      <p className="font-bold">{notification.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-normal">{notification.message}</p>
                      <p className="text-xs text-muted-foreground text-left mt-1">
                        {notification.timestamp ? new Date(notification.timestamp.toDate()).toLocaleString('ar-EG') : ''}
                      </p>
                    </div>
                    {user.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-destructive hover:text-destructive/80 mr-2 rtl:ml-2 rtl:mr-0"
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                  </div>
                )
            })}
          </div>
        ) : (
          <DropdownMenuItem disabled>
            <div className="flex items-center justify-center w-full p-4">
                <Mail className="w-5 h-5 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                <span>لا توجد إشعارات جديدة</span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBell;
