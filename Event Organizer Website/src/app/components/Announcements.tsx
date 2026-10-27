import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Send, ThumbsUp, Heart, Smile } from 'lucide-react';
import { toast } from 'sonner';

export const Announcements = () => {
  const navigate = useNavigate();
  const { user, announcements, addAnnouncement, reactToAnnouncement } = useApp();
  const theme = useTheme(user?.role);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const canPost = user?.role === 'admin' || user?.role === 'coordinator';

  const handlePostAnnouncement = () => {
    if (!newAnnouncement.trim()) return;

    const announcement = {
      id: Math.random().toString(36).substr(2, 9),
      message: newAnnouncement,
      author: user!.name,
      authorRole: user!.role,
      date: new Date().toISOString(),
      reactions: {}
    };

    addAnnouncement(announcement);
    setNewAnnouncement('');
    toast.success('Announcement posted successfully!');
  };

  const handleReact = (announcementId: string, reaction: string) => {
    reactToAnnouncement(announcementId, reaction);
  };

  const reactions = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '🎉', label: 'Celebrate' },
    { emoji: '😊', label: 'Smile' }
  ];

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

        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Announcements</h1>
            <p className={theme.accent}>Stay updated with the latest news and updates</p>
          </div>

          {canPost && (
            <Card className={`${theme.card} border-2 p-6 mb-8`}>
              <h3 className="font-semibold mb-4">Post New Announcement</h3>
              <Textarea
                placeholder="What would you like to announce?"
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                className="mb-4 bg-white/10 min-h-[120px]"
              />
              <Button
                className={theme.button}
                onClick={handlePostAnnouncement}
                disabled={!newAnnouncement.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Post Announcement
              </Button>
            </Card>
          )}

          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className={`${theme.card} border-2 p-6`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-full ${theme.button} flex items-center justify-center font-bold`}>
                    {announcement.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{announcement.author}</p>
                      <span className={`text-xs ${theme.accent} px-2 py-0.5 rounded-full bg-white/10 capitalize`}>
                        {announcement.authorRole}
                      </span>
                    </div>
                    <p className={`text-sm ${theme.accent}`}>
                      {new Date(announcement.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                <p className="mb-4 whitespace-pre-wrap">{announcement.message}</p>

                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                  {reactions.map((reaction) => (
                    <Button
                      key={reaction.emoji}
                      variant="ghost"
                      size="sm"
                      className={`${theme.accent} hover:bg-white/10`}
                      onClick={() => handleReact(announcement.id, reaction.emoji)}
                    >
                      <span className="mr-1">{reaction.emoji}</span>
                      <span className="text-sm">
                        {announcement.reactions[reaction.emoji] || 0}
                      </span>
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {announcements.length === 0 && (
            <Card className={`${theme.card} border-2 p-12 text-center`}>
              <p className={theme.accent}>No announcements yet. Check back later!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
