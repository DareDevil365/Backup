import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card } from '@/app/components/ui/card';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const PaymentGateway = () => {
  const { eventId, passType } = useParams();
  const navigate = useNavigate();
  const { user, events, addTicket } = useApp();
  const theme = useTheme(user?.role);
  const [processing, setProcessing] = useState(false);

  const event = events.find(e => e.id === eventId);
  const prices = { golden: 2999, silver: 1499 };
  const price = prices[passType as keyof typeof prices];

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const ticket = {
        id: Math.random().toString(36).substr(2, 9),
        eventId: eventId!,
        eventName: event!.name,
        passType: passType as 'golden' | 'silver',
        price,
        purchaseDate: new Date().toISOString(),
        qrCode: `TICKET-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };

      addTicket(ticket);
      setProcessing(false);
      toast.success('Payment successful! Your ticket has been generated.');
      navigate('/tickets');
    }, 2000);
  };

  if (!event) return null;

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text}`}>
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          className={`mb-6 ${theme.accent}`}
          onClick={() => navigate(`/payment/${eventId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pass Selection
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Payment</h1>
            <p className={theme.accent}>Secure payment gateway</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className={`${theme.card} border-2 p-8`}>
                <form onSubmit={handlePayment} className="space-y-6">
                  <div>
                    <Label htmlFor="cardNumber" className={theme.text}>Card Number</Label>
                    <div className="relative mt-2">
                      <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={paymentData.cardNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, cardNumber: e.target.value })}
                        className="pl-12 bg-white/10"
                        maxLength={19}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardName" className={theme.text}>Cardholder Name</Label>
                    <Input
                      id="cardName"
                      type="text"
                      placeholder="John Doe"
                      value={paymentData.cardName}
                      onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value })}
                      className="mt-2 bg-white/10"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate" className={theme.text}>Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="text"
                        placeholder="MM/YY"
                        value={paymentData.expiryDate}
                        onChange={(e) => setPaymentData({ ...paymentData, expiryDate: e.target.value })}
                        className="mt-2 bg-white/10"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className={theme.text}>CVV</Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={paymentData.cvv}
                        onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value })}
                        className="mt-2 bg-white/10"
                        maxLength={3}
                        required
                      />
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-4 rounded-lg bg-white/5 border ${theme.card.split(' ').find(c => c.includes('border'))}`}>
                    <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Your payment information is secure and encrypted. We never store your card details.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full ${theme.button} py-6 text-lg`}
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : `Pay ₹${price}`}
                  </Button>
                </form>
              </Card>
            </div>

            <div>
              <Card className={`${theme.card} border-2 p-6 sticky top-6`}>
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <p className={`text-sm ${theme.accent}`}>Event</p>
                    <p className="font-semibold">{event.name}</p>
                  </div>

                  <div>
                    <p className={`text-sm ${theme.accent}`}>Pass Type</p>
                    <p className="font-semibold capitalize">{passType} Pass</p>
                  </div>

                  <div>
                    <p className={`text-sm ${theme.accent}`}>Date</p>
                    <p className="font-semibold">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className={`border-t ${theme.card.split(' ').find(c => c.includes('border'))} pt-4 space-y-2`}>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee</span>
                    <span>₹0</span>
                  </div>
                  <div className={`flex justify-between text-xl font-bold pt-2 border-t ${theme.card.split(' ').find(c => c.includes('border'))}`}>
                    <span>Total</span>
                    <span>₹{price}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
