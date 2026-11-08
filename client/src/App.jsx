import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DeckDetailPage from './pages/DeckDetailPage';
import CreateEditDeckPage from './pages/CreateEditDeckPage';
import FlashcardStudyPage from './pages/FlashcardStudyPage';
import QuizModePage from './pages/QuizModePage';
import MatchGamePage from './pages/MatchGamePage';
import AdminPage from './pages/AdminPage';

// Private Route Guard
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

// Admin Route Guard
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/decks/:id" element={<DeckDetailPage />} />

          {/* Protected routes */}
          <Route
            path="/create"
            element={
              <PrivateRoute>
                <CreateEditDeckPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/decks/:id/edit"
            element={
              <PrivateRoute>
                <CreateEditDeckPage />
              </PrivateRoute>
            }
          />

          {/* Interactive Study & Game Modes */}
          <Route path="/decks/:id/flashcards" element={<FlashcardStudyPage />} />
          <Route path="/decks/:id/quiz" element={<QuizModePage />} />
          <Route path="/decks/:id/match" element={<MatchGamePage />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

