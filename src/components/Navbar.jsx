
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import NotificationsBell from '@/components/NotificationsBell';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { user, logout, schoolSettings } = useAuth();
  const { unreadChatsCount } = useChat();
  const navigate = useNavigate();
  const [currentSchoolName, setCurrentSchoolName] = useState('مدرستنا تك');
  const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/3ba56b60-c3fa-4b52-8e67-c1dea4ab1636/3e65cc517d9039f74d4f9a08b8568025.png";

  useEffect(() => {
    if (schoolSettings && schoolSettings.schoolName) {
      setCurrentSchoolName(schoolSettings.schoolName);
    }
  }, [schoolSettings]);

  const handleLogout = () => {
    logout();
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'student':
        return '/student';
      default:
        return '/login';
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-card shadow-md sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={getDashboardLink()} className="flex items-center space-x-2 rtl:space-x-reverse text-primary hover:text-primary/80 transition-colors">
            <motion.img 
              src={logoUrl} 
              alt="School Logo" 
              className="h-10 w-10"
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
            />
            <span className="text-xl font-bold">{currentSchoolName}</span>
          </Link>
          
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <NotificationsBell />
            <Link to="/chat">
              <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="h-5 w-5" />
                {unreadChatsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{unreadChatsCount}</Badge>
                )}
              </Button>
            </Link>
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="px-2 flex items-center">
                        <UserCircle size={24} />
                        <span className="hidden md:inline mr-2 rtl:mr-0 rtl:ml-2">{user.name}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        أهلاً بك, {user.name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(user.role === 'admin' || user.role === 'teacher') && (
                      <DropdownMenuItem asChild>
                        <Link to={user.role === 'admin' ? '/admin/profile' : '/teacher/profile'} className="cursor-pointer">
                          <User className="h-4 w-4 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                          <span>الملف الشخصي</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                        <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
