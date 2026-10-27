import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/app/context/AppContext';
import { Toaster } from '@/app/components/ui/sonner';
import { Auth } from '@/app/components/Auth';
import { Dashboard } from '@/app/components/Dashboard';
import { EventDetails } from '@/app/components/EventDetails';
import { Payment } from '@/app/components/Payment';
import { PaymentGateway } from '@/app/components/PaymentGateway';
import { MyTickets } from '@/app/components/MyTickets';
import { Profile } from '@/app/components/Profile';
import { Announcements } from '@/app/components/Announcements';
import { ImportantDates } from '@/app/components/ImportantDates';
import { History } from '@/app/components/History';
import { Terms } from '@/app/components/Terms';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useApp();
  return user ? <>{children}</> : <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/event/:eventId"
          element={
            <PrivateRoute>
              <EventDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/payment/:eventId"
          element={
            <PrivateRoute>
              <Payment />
            </PrivateRoute>
          }
        />
        <Route
          path="/payment-gateway/:eventId/:passType"
          element={
            <PrivateRoute>
              <PaymentGateway />
            </PrivateRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <PrivateRoute>
              <MyTickets />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <PrivateRoute>
              <Announcements />
            </PrivateRoute>
          }
        />
        <Route
          path="/important-dates"
          element={
            <PrivateRoute>
              <ImportantDates />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <PrivateRoute>
              <Terms />
            </PrivateRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
