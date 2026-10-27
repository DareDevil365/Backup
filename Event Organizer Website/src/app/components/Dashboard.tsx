import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Menu, QrCode, Calendar, Users } from 'lucide-react';
import { Sidebar } from '@/app/components/Sidebar';
import { QRScanner } from '@/app/components/QRScanner';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, events } = useApp();
  const theme = useTheme(user?.role);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {scannerOpen && (
        <QRScanner onClose={() => setScannerOpen(false)} />
      )}

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`${theme.accent} hover:bg-white/10`}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Welcome, {user.name}!</h1>
              <p className={`${theme.accent} capitalize`}>{user.role} Dashboard</p>
            </div>
          </div>

          <Button
            className={`${theme.button}`}
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="h-5 w-5 mr-2" />
            Scan QR Code
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={`${theme.card} border-2 p-6`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${theme.button}`}>
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-sm ${theme.accent}`}>Upcoming Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </Card>

          <Card className={`${theme.card} border-2 p-6`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${theme.button}`}>
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-sm ${theme.accent}`}>Your Role</p>
                <p className="text-2xl font-bold capitalize">{user.role}</p>
              </div>
            </div>
          </Card>

          <Card className={`${theme.card} border-2 p-6`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${theme.button}`}>
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-sm ${theme.accent}`}>Active Tickets</p>
                <p className="text-2xl font-bold">{events.filter(e => !e.comingSoon).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Events Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">All Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className={`${theme.card} border-2 p-6 cursor-pointer hover:scale-105 transition-transform`}
                onClick={() => navigate(`/event/${event.id}`)}
              >
                <div className="mb-4">
                  <div className="h-40 bg-gradient-to-br from-white/20 to-white/5 rounded-lg mb-4 flex items-center justify-center">
                    <Calendar className="h-16 w-16 opacity-50" />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                <p className={`text-sm ${theme.accent} mb-4 line-clamp-2`}>
                  {event.description}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${theme.accent}`}>Date</p>
                    <p className="text-sm font-semibold">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {event.comingSoon && (
                    <div className={`${theme.button} px-3 py-1 rounded-full text-xs font-semibold`}>
                      Coming Soon
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              className={`${theme.button} h-20`}
              onClick={() => navigate('/tickets')}
            >
              <div className="text-center">
                <QrCode className="h-6 w-6 mx-auto mb-2" />
                <span>My Tickets</span>
              </div>
            </Button>
            <Button
              className={`${theme.button} h-20`}
              onClick={() => navigate('/announcements')}
            >
              <div className="text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <span>Announcements</span>
              </div>
            </Button>
            <Button
              className={`${theme.button} h-20`}
              onClick={() => navigate('/important-dates')}
            >
              <div className="text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2" />
                <span>Important Dates</span>
              </div>
            </Button>
            <Button
              className={`${theme.button} h-20`}
              onClick={() => navigate('/profile')}
            >
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <span>My Profile</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
