import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ArrowLeft, History as HistoryIcon, Calendar, CreditCard } from 'lucide-react';

export const History = () => {
  const navigate = useNavigate();
  const { user, tickets } = useApp();
  const theme = useTheme(user?.role);

  const sortedTickets = [...tickets].sort((a, b) => 
    new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

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

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
            <p className={theme.accent}>View all your previous ticket purchases</p>
          </div>

          {sortedTickets.length === 0 ? (
            <Card className={`${theme.card} border-2 p-12 text-center`}>
              <HistoryIcon className="h-24 w-24 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Purchase History</h3>
              <p className={`${theme.accent} mb-6`}>
                You haven't made any ticket purchases yet.
              </p>
              <Button
                className={theme.button}
                onClick={() => navigate('/dashboard')}
              >
                Browse Events
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTickets.map((ticket) => (
                <Card key={ticket.id} className={`${theme.card} border-2 p-6`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{ticket.eventName}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <p className={`text-xs ${theme.accent}`}>Purchased On</p>
                            <p>
                              {new Date(ticket.purchaseDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <div>
                            <p className={`text-xs ${theme.accent}`}>Pass Type</p>
                            <p className="capitalize">{ticket.passType} Pass</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <div>
                            <p className={`text-xs ${theme.accent}`}>Amount Paid</p>
                            <p className="font-bold">₹{ticket.price}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        className={theme.button}
                        onClick={() => navigate('/tickets')}
                      >
                        View Ticket
                      </Button>
                      <p className={`text-xs ${theme.accent} font-mono text-center`}>
                        {ticket.qrCode}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}

              <Card className={`${theme.card} border-2 p-6 mt-8`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme.accent} mb-1`}>Total Purchases</p>
                    <p className="text-2xl font-bold">{sortedTickets.length}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${theme.accent} mb-1`}>Total Spent</p>
                    <p className="text-2xl font-bold">
                      ₹{sortedTickets.reduce((sum, ticket) => sum + ticket.price, 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
