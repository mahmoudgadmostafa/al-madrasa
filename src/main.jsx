import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext'; // ✅ تم الاستيراد هنا
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from 'react-helmet-async';

import { initializeApp, getApps } from "firebase/app";
import firebaseConfig from '@/config/firebaseConfig';

// ✅ تأكد من تهيئة Firebase الأساسي مرة واحدة فقط
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// ✅ تهيئة إضافية لتطبيق فرعي إذا كنت تحتاجه
if (!getApps().some(app => app.name === 'admin-creation-app')) {
  initializeApp(firebaseConfig, 'admin-creation-app');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider> {/* ✅ تم اللف حول App هنا */}
            <App />
            <Toaster />
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
