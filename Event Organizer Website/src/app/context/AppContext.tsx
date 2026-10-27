import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'coordinator' | 'crew' | 'attendee';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profilePhoto?: string;
  invitationCode?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  comingSoon?: boolean;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  passType: 'golden' | 'silver';
  price: number;
  purchaseDate: string;
  qrCode: string;
}

export interface Announcement {
  id: string;
  message: string;
  author: string;
  authorRole: UserRole;
  date: string;
  reactions: { [key: string]: number };
}

export interface ImportantDate {
  id: string;
  title: string;
  date: string;
  description: string;
}

interface AppContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  events: Event[];
  tickets: Ticket[];
  announcements: Announcement[];
  importantDates: ImportantDate[];
  addTicket: (ticket: Ticket) => void;
  addAnnouncement: (announcement: Announcement) => void;
  reactToAnnouncement: (announcementId: string, reaction: string) => void;
  updateImportantDates: (dates: ImportantDate[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [events] = useState<Event[]>([
    {
      id: '1',
      name: 'Waves',
      description: 'The ultimate music and cultural festival featuring performances, competitions, and exhibitions.',
      date: '2026-03-15',
      comingSoon: true
    },
    {
      id: '2',
      name: 'Spree',
      description: 'Annual sports and adventure festival with various sporting events and challenges.',
      date: '2026-04-10',
      comingSoon: true
    },
    {
      id: '3',
      name: 'Quark',
      description: 'The biggest technical festival showcasing innovation, technology, and engineering prowess.',
      date: '2026-02-20',
      comingSoon: true
    },
    {
      id: '4',
      name: 'Lost Block',
      description: 'Mystery and adventure themed event with treasure hunts and escape rooms.',
      date: '2026-05-05',
      comingSoon: true
    }
  ]);

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const stored = localStorage.getItem('tickets');
    return stored ? JSON.parse(stored) : [];
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const stored = localStorage.getItem('announcements');
    return stored ? JSON.parse(stored) : [
      {
        id: '1',
        message: 'Welcome to the Fest Organizer platform! Stay tuned for updates.',
        author: 'Admin',
        authorRole: 'admin' as UserRole,
        date: new Date().toISOString(),
        reactions: { '👍': 5, '🎉': 3 }
      }
    ];
  });

  const [importantDates, setImportantDates] = useState<ImportantDate[]>(() => {
    const stored = localStorage.getItem('importantDates');
    return stored ? JSON.parse(stored) : [
      {
        id: '1',
        title: 'Early Bird Registration Opens',
        date: '2026-01-15',
        description: 'Get your tickets at discounted prices'
      },
      {
        id: '2',
        title: 'Quark Festival',
        date: '2026-02-20',
        description: 'Technical festival begins'
      },
      {
        id: '3',
        title: 'Waves Festival',
        date: '2026-03-15',
        description: 'Cultural and music festival'
      },
      {
        id: '4',
        title: 'Spree Festival',
        date: '2026-04-10',
        description: 'Sports and adventure festival'
      }
    ];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('importantDates', JSON.stringify(importantDates));
  }, [importantDates]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const addTicket = (ticket: Ticket) => {
    setTickets(prev => [...prev, ticket]);
  };

  const addAnnouncement = (announcement: Announcement) => {
    setAnnouncements(prev => [announcement, ...prev]);
  };

  const reactToAnnouncement = (announcementId: string, reaction: string) => {
    setAnnouncements(prev =>
      prev.map(ann =>
        ann.id === announcementId
          ? {
              ...ann,
              reactions: {
                ...ann.reactions,
                [reaction]: (ann.reactions[reaction] || 0) + 1
              }
            }
          : ann
      )
    );
  };

  const updateImportantDates = (dates: ImportantDate[]) => {
    setImportantDates(dates);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        events,
        tickets,
        announcements,
        importantDates,
        addTicket,
        addAnnouncement,
        reactToAnnouncement,
        updateImportantDates
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
