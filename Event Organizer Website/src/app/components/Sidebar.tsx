import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Ticket, Calendar, Bell, History, User, FileText, LogOut, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const theme = useTheme(user?.role);

  const menuItems = [
    { icon: Ticket, label: 'My Tickets', path: '/tickets' },
    { icon: Calendar, label: 'Important Dates', path: '/important-dates' },
    { icon: Bell, label: 'Announcements', path: '/announcements' },
    { icon: History, label: 'History', path: '/history' },
    { icon: User, label: 'My Profile', path: '/profile' },
    { icon: FileText, label: 'Terms & Conditions', path: '/terms' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className={`${theme.background} ${theme.text} border-r-2 ${theme.card.split(' ').find(c => c.includes('border'))}`}>
        <SheetHeader>
          <SheetTitle className={theme.text}>Menu</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="mt-8 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`w-full justify-start ${theme.accent} hover:bg-white/10`}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            );
          })}

          <div className="pt-6 mt-6 border-t border-white/20">
            <Button
              variant="ghost"
              className={`w-full justify-start text-red-400 hover:bg-red-500/10`}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>

        {user && (
          <div className={`absolute bottom-6 left-6 right-6 ${theme.card} border-2 rounded-lg p-4`}>
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full ${theme.button} flex items-center justify-center text-lg font-bold`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user.name}</p>
                <p className={`text-xs ${theme.accent} capitalize`}>{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
