import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';

const ChatContext = createContext({
    unreadChatsCount: 0,
});

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [unreadChatsCount, setUnreadChatsCount] = useState(0);
    const db = getFirestore();

    useEffect(() => {
        if (!user) {
            setUnreadChatsCount(0);
            return;
        }

        const chatsQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
            let count = 0;
            snapshot.forEach((doc) => {
                const chat = doc.data();
                const isUnread = chat.lastMessage &&
                                 chat.lastMessage.senderId !== user.uid &&
                                 (!chat.readBy || !chat.readBy.includes(user.uid));
                if (isUnread) {
                    count++;
                }
            });
            setUnreadChatsCount(count);
        });

        return () => unsubscribe();
    }, [db, user]);

    return (
        <ChatContext.Provider value={{ unreadChatsCount }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    return useContext(ChatContext);
};