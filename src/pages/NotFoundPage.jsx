import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
      >
        <AlertTriangle className="w-24 h-24 text-destructive mx-auto mb-6" />
        <h1 className="text-5xl font-extrabold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-muted-foreground mb-6">عفواً، الصفحة غير موجودة!</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          يبدو أنك ضللت الطريق. الصفحة التي تبحث عنها إما تم حذفها أو لم تكن موجودة أصلاً.
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/">العودة إلى الصفحة الرئيسية</Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;