import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ArrowLeft, Check, Star, Sparkles } from 'lucide-react';

export const Payment = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, events } = useApp();
  const theme = useTheme(user?.role);
  const [selectedPass, setSelectedPass] = useState<'golden' | 'silver' | null>(null);

  const event = events.find(e => e.id === eventId);

  if (!event) {
    return null;
  }

  const passes = {
    golden: {
      name: 'Golden Pass',
      price: 2999,
      features: [
        'Access to all events',
        'VIP seating arrangement',
        'Complimentary food & beverages',
        'Meet & greet with celebrities',
        'Exclusive merchandise',
        'Priority entry',
        'Free parking'
      ],
      icon: Star,
      gradient: 'from-yellow-400 via-yellow-500 to-yellow-600'
    },
    silver: {
      name: 'Silver Pass',
      price: 1499,
      features: [
        'Access to all events',
        'General seating',
        'Food court access',
        'Event merchandise (at discount)',
        'Standard entry'
      ],
      icon: Sparkles,
      gradient: 'from-gray-300 via-gray-400 to-gray-500'
    }
  };

  const handleProceedToPayment = () => {
    if (selectedPass) {
      navigate(`/payment-gateway/${eventId}/${selectedPass}`);
    }
  };

  return (
    <div className={`min-h-screen ${theme.background} ${theme.text}`}>
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          className={`mb-6 ${theme.accent}`}
          onClick={() => navigate(`/event/${eventId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Pass</h1>
            <p className={`text-lg ${theme.accent}`}>
              Select the perfect pass for {event.name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {Object.entries(passes).map(([key, pass]) => {
              const Icon = pass.icon;
              const isSelected = selectedPass === key;
              
              return (
                <Card
                  key={key}
                  className={`${theme.card} border-4 p-8 cursor-pointer transition-all ${
                    isSelected ? 'scale-105 shadow-2xl' : 'hover:scale-102'
                  }`}
                  onClick={() => setSelectedPass(key as 'golden' | 'silver')}
                >
                  <div className="text-center mb-6">
                    <div className={`inline-block p-4 rounded-full bg-gradient-to-br ${pass.gradient} mb-4`}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{pass.name}</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">₹{pass.price}</span>
                      <span className={`text-sm ${theme.accent}`}>per person</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {pass.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className={`h-5 w-5 ${theme.accent} flex-shrink-0 mt-0.5`} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full ${isSelected ? theme.button : 'bg-white/10 hover:bg-white/20'}`}
                    onClick={() => setSelectedPass(key as 'golden' | 'silver')}
                  >
                    {isSelected ? 'Selected' : 'Select Pass'}
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className={`${theme.card} border-2 p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme.accent} mb-1`}>Total Amount</p>
                <p className="text-3xl font-bold">
                  {selectedPass ? `₹${passes[selectedPass].price}` : '₹0'}
                </p>
              </div>
              <Button
                className={`${theme.button} px-8 py-6 text-lg`}
                disabled={!selectedPass}
                onClick={handleProceedToPayment}
              >
                Proceed to Payment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
