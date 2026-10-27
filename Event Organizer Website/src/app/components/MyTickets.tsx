import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Download, Ticket, Calendar } from 'lucide-react';

export const MyTickets = () => {
  const navigate = useNavigate();
  const { user, tickets } = useApp();
  const theme = useTheme(user?.role);

  const downloadQR = (ticketId: string, eventName: string) => {
    const canvas = document.getElementById(`qr-${ticketId}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `ticket-${eventName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
          <p className={theme.accent}>View and download your event tickets</p>
        </div>

        {tickets.length === 0 ? (
          <Card className={`${theme.card} border-2 p-12 text-center`}>
            <Ticket className="h-24 w-24 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Tickets Yet</h3>
            <p className={`${theme.accent} mb-6`}>
              You haven't purchased any tickets. Browse our events and get your tickets now!
            </p>
            <Button
              className={theme.button}
              onClick={() => navigate('/dashboard')}
            >
              Browse Events
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className={`${theme.card} border-2 p-6`}>
                <div className="text-center mb-6">
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <QRCodeSVG
                      id={`qr-${ticket.id}`}
                      value={ticket.qrCode}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className={`text-xs ${theme.accent} font-mono`}>{ticket.qrCode}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className={`text-xs ${theme.accent}`}>Event</p>
                    <p className="font-semibold">{ticket.eventName}</p>
                  </div>

                  <div>
                    <p className={`text-xs ${theme.accent}`}>Pass Type</p>
                    <p className="font-semibold capitalize">{ticket.passType} Pass</p>
                  </div>

                  <div>
                    <p className={`text-xs ${theme.accent}`}>Amount Paid</p>
                    <p className="font-semibold">₹{ticket.price}</p>
                  </div>

                  <div>
                    <p className={`text-xs ${theme.accent}`}>Purchase Date</p>
                    <p className="font-semibold">
                      {new Date(ticket.purchaseDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <Button
                  className={`w-full ${theme.button}`}
                  onClick={() => downloadQR(ticket.id, ticket.eventName)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </Card>
            ))}
          </div>
        )}

        <Card className={`${theme.card} border-2 p-6 mt-8`}>
          <div className="flex items-start gap-4">
            <Calendar className="h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Important Information</h3>
              <ul className={`text-sm ${theme.accent} space-y-1`}>
                <li>• Present this QR code at the event entrance for scanning</li>
                <li>• Download and save the QR code offline for easy access</li>
                <li>• Each QR code is unique and can only be used once</li>
                <li>• Contact support if you face any issues with your ticket</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
