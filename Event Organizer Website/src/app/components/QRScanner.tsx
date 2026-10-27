import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { X, QrCode, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  onClose: () => void;
}

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const navigate = useNavigate();
  const { user, events } = useApp();
  const theme = useTheme(user?.role);
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleScan = (qrData: string) => {
    // Check if QR code matches an event
    if (qrData.startsWith('EVENT-')) {
      const eventId = qrData.replace('EVENT-', '');
      const event = events.find(e => e.id === eventId);
      
      if (event) {
        toast.success(`Redirecting to ${event.name}`);
        onClose();
        navigate(`/event/${event.id}`);
      } else {
        toast.error('Event not found');
      }
    } else if (qrData.startsWith('TICKET-')) {
      toast.success('Valid ticket scanned!');
      onClose();
    } else {
      toast.error('Invalid QR code');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput) {
      handleScan(manualInput);
      setManualInput('');
    }
  };

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      // Simulate scanning an event QR
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      handleScan(`EVENT-${randomEvent.id}`);
      setScanning(false);
    }, 1500);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={`${theme.background} ${theme.text} border-2 ${theme.card.split(' ').find(c => c.includes('border'))}`}>
        <DialogHeader>
          <DialogTitle className={theme.text}>QR Code Scanner</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Scanner Display */}
          <div className={`relative aspect-square ${theme.card} rounded-lg overflow-hidden border-4 ${theme.card.split(' ').find(c => c.includes('border'))}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              {scanning ? (
                <div className="text-center">
                  <div className="animate-pulse mb-4">
                    <QrCode className="h-24 w-24 mx-auto" />
                  </div>
                  <p className={theme.accent}>Scanning...</p>
                </div>
              ) : (
                <div className="text-center">
                  <QrCode className="h-24 w-24 mx-auto mb-4 opacity-50" />
                  <p className={theme.accent}>Position QR code in frame</p>
                </div>
              )}
            </div>

            {/* Scanner Frame Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-4 border-white/50 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
              </div>
            </div>
          </div>

          <Button
            className={`w-full ${theme.button} py-6`}
            onClick={simulateScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Start Scanning'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className={`w-full border-t ${theme.card.split(' ').find(c => c.includes('border'))}`} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className={`${theme.background} px-2 ${theme.accent}`}>Or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter QR code manually"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="bg-white/10"
            />
            <Button type="submit" className={`w-full ${theme.button}`}>
              <Check className="h-4 w-4 mr-2" />
              Submit Code
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
