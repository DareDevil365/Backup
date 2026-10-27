import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ArrowLeft, User, Mail, Phone, Shield, Edit } from 'lucide-react';

export const Profile = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const theme = useTheme(user?.role);

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text}`}>
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          className={`mb-6 ${theme.accent}`}
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className={theme.accent}>Manage your account information</p>
          </div>

          <Card className={`${theme.card} border-2 p-8 mb-6`}>
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`h-32 w-32 rounded-full ${theme.button} flex items-center justify-center text-5xl font-bold mb-4`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
              <p className={`${theme.accent} capitalize`}>{user.role}</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
                <Mail className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`text-sm ${theme.accent} mb-1`}>Email Address</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
                <Phone className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`text-sm ${theme.accent} mb-1`}>Phone Number</p>
                  <p className="font-semibold">{user.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
                <Shield className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`text-sm ${theme.accent} mb-1`}>Role</p>
                  <p className="font-semibold capitalize">{user.role}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
                <User className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className={`text-sm ${theme.accent} mb-1`}>User ID</p>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
              </div>

              {user.invitationCode && (
                <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5">
                  <Shield className="h-6 w-6 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className={`text-sm ${theme.accent} mb-1`}>Invitation Code</p>
                    <p className="font-mono text-sm">{user.invitationCode}</p>
                  </div>
                </div>
              )}
            </div>

            <Button className={`w-full mt-8 ${theme.button}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Card>

          <Card className={`${theme.card} border-2 p-6`}>
            <h3 className="font-semibold mb-4">Account Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className={`text-sm ${theme.accent}`}>Events Attended</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className={`text-sm ${theme.accent}`}>Tickets Purchased</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className={`text-sm ${theme.accent}`}>Points Earned</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
