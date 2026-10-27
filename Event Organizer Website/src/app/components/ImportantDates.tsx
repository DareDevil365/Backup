import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/app/context/AppContext';
import { useTheme } from '@/app/hooks/useTheme';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { ArrowLeft, Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const ImportantDates = () => {
  const navigate = useNavigate();
  const { user, importantDates, updateImportantDates } = useApp();
  const theme = useTheme(user?.role);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: ''
  });

  const canEdit = user?.role === 'admin';

  const handleAddDate = () => {
    if (!formData.title || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }

    const newDate = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData
    };

    updateImportantDates([...importantDates, newDate]);
    setFormData({ title: '', date: '', description: '' });
    setIsDialogOpen(false);
    toast.success('Date added successfully!');
  };

  const handleDeleteDate = (id: string) => {
    updateImportantDates(importantDates.filter(d => d.id !== id));
    toast.success('Date removed successfully!');
  };

  const sortedDates = [...importantDates].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Important Dates</h1>
              <p className={theme.accent}>Keep track of upcoming events and deadlines</p>
            </div>
            {canEdit && (
              <Button
                className={theme.button}
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Date
              </Button>
            )}
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className={`absolute left-8 top-0 bottom-0 w-0.5 ${theme.card.split(' ').find(c => c.includes('border'))}`} />

            <div className="space-y-8">
              {sortedDates.map((date, index) => (
                <div key={date.id} className="relative pl-20">
                  {/* Timeline dot */}
                  <div className={`absolute left-6 top-6 h-5 w-5 rounded-full ${theme.button} border-4 ${theme.background}`} />

                  <Card className={`${theme.card} border-2 p-6`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{date.title}</h3>
                        <p className={`text-sm ${theme.accent} flex items-center gap-2`}>
                          <Calendar className="h-4 w-4" />
                          {new Date(date.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${theme.accent} hover:bg-white/10`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteDate(date.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className={theme.accent}>{date.description}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {sortedDates.length === 0 && (
            <Card className={`${theme.card} border-2 p-12 text-center`}>
              <Calendar className="h-24 w-24 mx-auto mb-4 opacity-50" />
              <p className={theme.accent}>No important dates scheduled yet.</p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`${theme.background} ${theme.text} border-2 ${theme.card.split(' ').find(c => c.includes('border'))}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>Add Important Date</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className={theme.text}>Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event title"
                className="mt-2 bg-white/10"
              />
            </div>

            <div>
              <Label htmlFor="date" className={theme.text}>Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 bg-white/10"
              />
            </div>

            <div>
              <Label htmlFor="description" className={theme.text}>Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more details..."
                className="mt-2 bg-white/10"
              />
            </div>

            <Button
              className={`w-full ${theme.button}`}
              onClick={handleAddDate}
            >
              Add Date
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
