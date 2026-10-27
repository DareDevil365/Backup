import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';

export const Terms = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const theme = useTheme(user?.role);

  const terms = [
    {
      title: 'No Refund Policy',
      content: 'All ticket purchases are final and non-refundable. Please review your order carefully before completing your purchase.'
    },
    {
      title: 'Ticket Cancellation',
      content: 'If you are caught doing anything inappropriate, illegal, or against event guidelines, your ticket will be cancelled immediately and you will not be allowed to enter the event. No refund will be provided in such cases.'
    },
    {
      title: 'Event Entry',
      content: 'You must present a valid QR code ticket at the event entrance. Each QR code is unique and can only be scanned once. Screenshot or digital copies are acceptable.'
    },
    {
      title: 'Conduct Rules',
      content: 'Attendees must maintain proper decorum and behavior at all times. Any form of harassment, violence, or disruptive behavior will result in immediate removal from the event.'
    },
    {
      title: 'Age Restrictions',
      content: 'Some events may have age restrictions. Please check the event details before purchasing tickets. Valid ID proof may be required for verification.'
    },
    {
      title: 'Photography and Recording',
      content: 'Photography for personal use is allowed. However, professional recording equipment and commercial photography require prior permission from event organizers.'
    },
    {
      title: 'Event Changes',
      content: 'The organizers reserve the right to make changes to the event schedule, venue, or lineup without prior notice. In case of event cancellation, refunds will be processed as per our discretion.'
    },
    {
      title: 'Lost or Stolen Tickets',
      content: 'We are not responsible for lost or stolen tickets. Please keep your QR code secure and do not share it with anyone.'
    },
    {
      title: 'Liability',
      content: 'Attendees participate in events at their own risk. The organizers are not liable for any personal injury, loss, or damage to property during the event.'
    },
    {
      title: 'Privacy Policy',
      content: 'Your personal information will be used solely for event management purposes and will not be shared with third parties without your consent.'
    },
    {
      title: 'Prohibited Items',
      content: 'Weapons, illegal substances, outside food and beverages, and other prohibited items are not allowed at the venue. Security checks will be conducted at entry points.'
    },
    {
      title: 'Acceptance of Terms',
      content: 'By purchasing a ticket and attending the event, you acknowledge that you have read, understood, and agree to abide by all terms and conditions outlined here.'
    }
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

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
            <p className={theme.accent}>Please read these terms carefully before using our platform</p>
          </div>

          <Card className={`${theme.card} border-2 p-6 mb-6`}>
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-yellow-500" />
              <div>
                <h3 className="font-semibold mb-2">Important Notice</h3>
                <p className={`text-sm ${theme.accent}`}>
                  These terms and conditions govern your use of our platform and participation in events. By registering or purchasing tickets, you agree to comply with these terms.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {terms.map((term, index) => (
              <Card key={index} className={`${theme.card} border-2 p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full ${theme.button} flex items-center justify-center font-bold text-sm`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{term.title}</h3>
                    <p className={theme.accent}>{term.content}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className={`${theme.card} border-2 p-6 mt-8`}>
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8" />
              <div>
                <h3 className="font-semibold mb-1">Last Updated</h3>
                <p className={`text-sm ${theme.accent}`}>
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </Card>

          <div className={`mt-6 p-4 rounded-lg bg-white/5 border ${theme.card.split(' ').find(c => c.includes('border'))}`}>
            <p className="text-sm text-center">
              If you have any questions about these terms, please contact our support team at{' '}
              <a href="mailto:support@festorganizer.com" className={`${theme.accent} underline`}>
                support@festorganizer.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
