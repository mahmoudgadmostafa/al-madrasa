
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Save, KeyRound, AtSign, User, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user, updateUserProfile, updateUserEmailInAuth, updateUserPasswordInAuth, loadingAuth } = useAuth();
    const navigate = useNavigate();
    
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdateName = async (e) => {
        e.preventDefault();
        if (name.trim() === '') {
            toast({ title: "خطأ", description: "الاسم لا يمكن أن يكون فارغاً.", variant: "destructive" });
            return;
        }
        await updateUserProfile({ name });
    };
    
    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        if (email.trim() === '') {
             toast({ title: "خطأ", description: "البريد الإلكتروني لا يمكن أن يكون فارغاً.", variant: "destructive" });
            return;
        }
        if(email.trim().toLowerCase() === user.email.toLowerCase()) {
            toast({ title: "معلومات", description: "هذا هو بريدك الإلكتروني الحالي.", variant: "default" });
            return;
        }
        await updateUserEmailInAuth(email);
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل.", variant: "destructive" });
            return;
        }
        if (password !== confirmPassword) {
            toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين.", variant: "destructive" });
            return;
        }
        await updateUserPasswordInAuth(password);
        setPassword('');
        setConfirmPassword('');
    };

    const getDashboardLink = () => {
        if (!user) return "/login";
        switch (user.role) {
          case 'admin': return '/admin';
          case 'teacher': return '/teacher';
          case 'student': return '/student';
          default: return '/login';
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold text-foreground">إدارة الملف الشخصي</h1>
                    <Button variant="outline" onClick={() => navigate(getDashboardLink())}>
                        <ArrowLeft className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" />
                        العودة إلى لوحة التحكم
                    </Button>
                </div>
                <p className="text-muted-foreground mb-8">تعديل بيانات حسابك الشخصي.</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 md:w-2/3 mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><User className="mr-2 ml-0 rtl:ml-2 rtl:mr-0"/> تعديل المعلومات الشخصية</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleUpdateName}>
                        <CardContent>
                            <Label htmlFor="name">الاسم الكامل</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loadingAuth}>
                                <Save className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> حفظ الاسم
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><AtSign className="mr-2 ml-0 rtl:ml-2 rtl:mr-0"/> تعديل البريد الإلكتروني</CardTitle>
                        <CardDescription>قد تحتاج إلى تسجيل الخروج والدخول مجدداً بعد تغيير البريد الإلكتروني.</CardDescription>
                    </CardHeader>
                     <form onSubmit={handleUpdateEmail}>
                        <CardContent>
                            <Label htmlFor="email">البريد الإلكتروني</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loadingAuth}>
                                <Save className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> حفظ البريد الإلكتروني
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><KeyRound className="mr-2 ml-0 rtl:ml-2 rtl:mr-0"/> تعديل كلمة المرور</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleUpdatePassword}>
                        <CardContent className="space-y-4">
                             <div>
                                <Label htmlFor="password">كلمة المرور الجديدة</Label>
                                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="******" />
                             </div>
                             <div>
                                <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
                                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" placeholder="******" />
                             </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={loadingAuth}>
                                <Save className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 h-4 w-4" /> حفظ كلمة المرور
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;
