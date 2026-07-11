import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BannerAnnouncements from './components/public/BannerAnnouncements';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Loans from './pages/Loans';
import Savings from './pages/Savings';
import Downloads from './pages/Downloads';
import Membership from './pages/Membership';
import HowToApply from './pages/HowToApply';
import ApplicationPortal from './pages/ApplicationPortal';
import MembershipPortal from './pages/MembershipPortal';
import LoanPortal from './pages/LoanPortal';
import FAQ from './pages/FAQ';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Contact from './pages/Contact';
import ApplicationStatus from './pages/ApplicationStatus';
import NotFound from './pages/NotFound';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import ConsentDisclosure from './pages/ConsentDisclosure';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import MembershipQueue from './pages/admin/MembershipQueue';
import LoanQueue from './pages/admin/LoanQueue';
import MembersList from './pages/admin/MembersList';
import LoansList from './pages/admin/LoansList';
import ApplicationDetail from './pages/admin/ApplicationDetail';
import ContentManager from './pages/admin/ContentManager';

import SettingsHome from './pages/admin/SettingsHome';
import AuditLog from './pages/admin/AuditLog';
import { clearAdminSession, getAdminUser } from './lib/adminAuth';
import { adminFetch } from './lib/adminApi';
import { canAccessModule, type AdminModule } from './lib/adminRbac';
import { type PublicPage, resolvePublicPageFromPath } from './lib/publicRoutes';

export type Page = PublicPage;
export type AppType = 'membership' | 'loan';

type AdminSessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

function useAdminSessionStatus(): AdminSessionStatus {
  const [storedUser] = useState(() => getAdminUser());
  const [status, setStatus] = useState<AdminSessionStatus>(storedUser ? 'checking' : 'unauthenticated');

  useEffect(() => {
    if (!storedUser) {
      setStatus('unauthenticated');
      return;
    }

    let isActive = true;

    const validateSession = async () => {
      try {
        await adminFetch('/api/auth/me');
        if (isActive) {
          setStatus('authenticated');
        }
      } catch {
        clearAdminSession();
        if (isActive) {
          setStatus('unauthenticated');
        }
      }
    };

    void validateSession();

    return () => {
      isActive = false;
    };
  }, [storedUser]);

  return status;
}

function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const sessionStatus = useAdminSessionStatus();

  if (sessionStatus === 'checking') {
    return null;
  }

  if (sessionStatus === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const sessionStatus = useAdminSessionStatus();

  if (sessionStatus === 'checking') {
    return null;
  }

  if (sessionStatus === 'authenticated') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function RequireAdminModule({ module, children }: { module: AdminModule; children: React.ReactNode }) {
  const user = getAdminUser();
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!canAccessModule(user, module)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    window.scrollTo({ top: 0, behavior: isMobileViewport ? 'auto' : 'smooth' });

    const resolvedPage = resolvePublicPageFromPath(location.pathname);
    if (resolvedPage) {
      setCurrentPage(resolvedPage);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden flex flex-col">
      <a
        href={isAdminRoute ? '#admin-main-content' : '#public-main-content'}
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-blue-700 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <Toaster position="top-center" richColors />

      {!isAdminRoute && <BannerAnnouncements placement="Banner Top" />}
      {!isAdminRoute && <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />}

      <main id="public-main-content" className={["flex-grow", isAdminRoute ? 'pt-0' : 'pt-16 md:pt-36'].join(' ')}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services onNavigate={setCurrentPage} />} />
          <Route path="/loans" element={<Loans onNavigate={setCurrentPage} />} />
          <Route path="/savings" element={<Savings onNavigate={setCurrentPage} />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/membership" element={<Membership onNavigate={setCurrentPage} />} />
          <Route path="/membership-apply" element={<MembershipPortal />} />
          <Route path="/loan-apply" element={<LoanPortal />} />

          <Route path="/apply" element={<HowToApply />} />

          <Route
            path="/portal"
            element={
              <ApplicationPortal
                type="membership"
                onBack={() => setCurrentPage('apply')}
              />
            }
          />

          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />

          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/status" element={<ApplicationStatus />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/consent-disclosure" element={<ConsentDisclosure />} />

          <Route path="/admin/login" element={<RedirectIfAuthenticated><AdminLogin /></RedirectIfAuthenticated>} />
          <Route path="/admin" element={<RequireAdminAuth><AdminLayout /></RequireAdminAuth>}>
            <Route index element={<RequireAdminModule module="dashboard"><AdminDashboard /></RequireAdminModule>} />
            <Route path="dashboard" element={<RequireAdminModule module="dashboard"><AdminDashboard /></RequireAdminModule>} />
            <Route path="membership-queue" element={<RequireAdminModule module="membership"><MembershipQueue /></RequireAdminModule>} />
            <Route path="members-list" element={<RequireAdminModule module="members-list"><MembersList /></RequireAdminModule>} />
            <Route path="loan-queue" element={<RequireAdminModule module="loan"><LoanQueue /></RequireAdminModule>} />
            <Route path="loans-list" element={<RequireAdminModule module="loans-list"><LoansList /></RequireAdminModule>} />
            <Route path="document-review" element={<Navigate to="/admin/membership-queue" replace />} />
            <Route path="audit-log" element={<RequireAdminModule module="audit-log"><AuditLog /></RequireAdminModule>} />
            <Route path="applications/:type/:id" element={<RequireAdminModule module="dashboard"><ApplicationDetail /></RequireAdminModule>} />
            <Route path="cms" element={<RequireAdminModule module="cms"><ContentManager /></RequireAdminModule>} />
            <Route path="settings" element={<RequireAdminModule module="settings"><SettingsHome /></RequireAdminModule>} />
          </Route>

          <Route path="*" element={isAdminRoute ? <Navigate to="/admin/login" replace /> : <NotFound />} />
        </Routes>
      </main>

      {!isAdminRoute && <BannerAnnouncements placement="Banner Bottom" />}
      {!isAdminRoute && <Footer onNavigate={setCurrentPage} />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
}
