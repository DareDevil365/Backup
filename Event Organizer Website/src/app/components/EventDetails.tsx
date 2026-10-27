import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Users, Ticket } from 'lucide-react';

export const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, events } = useApp();
  const theme = useTheme(user?.role);

  const event = events.find(e => e.id === eventId);

  if (!event) {
    return (
      <div className={`min-h-screen ${theme.background} ${theme.text} flex items-center justify-center`}>
        <p>Event not found</p>
      </div>
    );
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className={`${theme.card} border-2 p-8`}>
              <div className="h-80 bg-gradient-to-br from-white/20 to-white/5 rounded-lg mb-6 flex items-center justify-center">
                <Calendar className="h-32 w-32 opacity-50" />
              </div>

              <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>Main Campus Venue</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>Open to All</span>
                </div>
              </div>

              {event.comingSoon && (
                <div className={`${theme.button} px-4 py-2 rounded-lg inline-block mb-6`}>
                  Coming Soon
                </div>
              )}

              <div className={`prose max-w-none ${theme.text}`}>
                <h2 className="text-2xl font-bold mb-4">About the Event</h2>
                <p className="mb-4">{event.description}</p>
                
                <h3 className="text-xl font-bold mb-3">What to Expect</h3>
                <ul className="list-disc list-inside space-y-2 mb-4">
                  <li>Amazing performances and competitions</li>
                  <li>Food stalls and entertainment zones</li>
                  <li>Networking opportunities</li>
                  <li>Prize distribution ceremony</li>
                  <li>Professional workshops and seminars</li>
                </ul>

                <h3 className="text-xl font-bold mb-3">Event Schedule</h3>
                <div className="space-y-2">
                  <p><strong>Day 1:</strong> Registration and Opening Ceremony</p>
                  <p><strong>Day 2-3:</strong> Main Events and Competitions</p>
                  <p><strong>Day 4:</strong> Finals and Closing Ceremony</p>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className={`${theme.card} border-2 p-6 sticky top-6`}>
              <h3 className="text-xl font-bold mb-4">Register for Event</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className={`text-sm ${theme.accent} mb-1`}>Event Date</p>
                  <p className="font-semibold">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div>
                  <p className={`text-sm ${theme.accent} mb-1`}>Venue</p>
                  <p className="font-semibold">Main Campus</p>
                </div>

                <div>
                  <p className={`text-sm ${theme.accent} mb-1`}>Duration</p>
                  <p className="font-semibold">4 Days</p>
                </div>
              </div>

              <Button
                className={`w-full ${theme.button}`}
                onClick={() => navigate(`/payment/${event.id}`)}
                disabled={event.comingSoon}
              >
                <Ticket className="h-5 w-5 mr-2" />
                {event.comingSoon ? 'Coming Soon' : 'Register Now'}
              </Button>

              <p className={`text-xs ${theme.accent} mt-4 text-center`}>
                Secure payment powered by our platform
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
