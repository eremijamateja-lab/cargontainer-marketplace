import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { t, formatRoleLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Plus, Truck, LogOut, Menu, X, Globe, User, ShoppingCart, Send, Eye, Building2, Search, Shield, MessageCircle } from 'lucide-react';
import { useUnreadMessageCount, useAdminPendingCount } from '@/hooks/useAppQueries';
import { supabaseSignOut } from '@/lib/supabase';

interface LayoutProps {
  children: ReactNode;
  user?: any;
  profile?: any;
  isAdmin?: boolean;
  onLogout: () => void;
}

export default function Layout({ children, user, profile, isAdmin, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, toggleLang } = useLanguage();
  const [logoError, setLogoError] = useState(false);

  const role = profile?.role || 'forwarder';
  const { data: unreadCount = 0 } = useUnreadMessageCount(!!profile);
  const { data: adminPendingCount = 0 } = useAdminPendingCount(!!isAdmin);

  const getNavItems = () => {
    const items = [
      { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    ];

    if (role === 'forwarder') {
      items.push(
        { key: 'requests', path: '/requests', icon: Plus, labelKey: 'nav.createRequest' },
        { key: 'marketplace', path: '/marketplace', icon: ShoppingCart, labelKey: 'nav.marketplace' },
        { key: 'offers', path: '/offers', icon: Send, labelKey: 'nav.myOffers' },
        { key: 'shipments', path: '/shipments', icon: Truck, labelKey: 'nav.myTransports' },
      );
    } else if (role === 'trucking' || role === 'rail') {
      items.push(
        { key: 'marketplace', path: '/marketplace', icon: ShoppingCart, labelKey: 'nav.openRequests' },
        { key: 'offers', path: '/offers', icon: Send, labelKey: 'nav.myOffers' },
        { key: 'shipments', path: '/shipments', icon: Truck, labelKey: 'nav.myTransports' },
      );
    } else if (role === 'terminal') {
      items.push(
        { key: 'marketplace', path: '/marketplace', icon: Eye, labelKey: 'nav.allRequests' },
      );
    }

    // All roles get Messages, Company and Directory
    items.push(
      { key: 'messages', path: '/messages', icon: MessageCircle, labelKey: 'nav.messages' },
      { key: 'company', path: '/company', icon: Building2, labelKey: 'nav.company' },
      { key: 'directory', path: '/directory', icon: Search, labelKey: 'nav.directory' },
    );

    // Admin gets admin panel
    if (isAdmin) {
      items.push(
        { key: 'admin', path: '/admin/approvals', icon: Shield, labelKey: 'nav.admin' },
      );
    }

    return items;
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await supabaseSignOut();
    // Local email/password auth stores its JWT under this key (see
    // Login.tsx) — clear it directly instead of routing through the
    // SDK's client.auth.logout(), which round-trips through the OIDC
    // logout endpoint this app doesn't configure and can silently fail
    // to redirect, leaving the user looking "stuck" logged in.
    try {
      localStorage.removeItem('token');
      localStorage.setItem('isLougOutManual', 'true');
    } catch {
      // localStorage unavailable — fall through to navigation anyway
    }
    onLogout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer shrink-0"
              onClick={() => navigate('/dashboard')}
              role="link"
              aria-label="Go to Dashboard"
            >
              {!logoError ? (
                <span className="block shrink-0 w-[170px] h-[48px] sm:w-[240px] sm:h-[56px]">
                  <img
                    src={lang === 'sr' ? '/assets/cargontainer-logo-sr.png' : '/assets/cargontainer-logo-en.png'}
                    alt="Cargontainer"
                    className="block w-full h-full object-contain object-left"
                    onError={() => setLogoError(true)}
                    loading="eager"
                    decoding="async"
                  />
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="h-7 w-7 sm:h-8 sm:w-8" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0H0V16H16V0Z" fill="#1e40af"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.09464 4.71886C5.37237 3.23064 6.55429 2.11255 7.97019 2.11255C9.59241 2.11255 10.9075 3.58021 10.9075 5.39067C10.9075 6.45829 10.4502 7.40672 9.74225 8.00526L9.73491 8.01557L8.31491 6.24058L9.55608 5.47396C9.56881 5.38304 9.57542 5.28984 9.57542 5.19493C9.57542 4.20554 8.85675 3.40346 7.97022 3.40346C7.12187 3.40346 6.42722 4.13793 6.36897 5.06819C5.98321 4.8691 5.55183 4.74605 5.09464 4.71886ZM4.43772 5.10727C4.14745 5.13006 3.87833 5.18311 3.6429 5.25539C2.41868 5.63124 1.4004 6.85453 1.60939 8.452C1.72598 9.34323 2.27382 9.96949 2.87787 10.3535C3.4717 10.7311 4.17528 10.9148 4.7644 10.9148L5.10636 9.2377C4.59263 9.35175 4.01359 9.35195 3.65825 9.12605C3.31313 8.90663 3.09804 8.61799 3.05164 8.26331C2.94478 7.44635 3.44696 6.83709 4.0698 6.64589C4.7612 6.43361 5.95115 6.48407 6.79218 7.60912C6.83478 7.66611 6.87692 7.72256 6.91867 7.77845C6.97473 7.85354 7.03004 7.92762 7.08467 8.00062H7.08447C7.34159 8.32167 7.62625 8.70256 7.9652 9.15611L8.0451 9.26302C9.01164 10.556 10.3096 10.9371 11.3736 10.9044C9.72812 10.7557 8.58158 9.13242 7.81302 8.00119H7.81346C7.00488 6.78096 6.49577 6.05872 5.4893 5.45658C5.10373 5.22589 4.72617 5.13674 4.43772 5.10727ZM11.5307 10.8965C11.2398 10.8691 10.8538 10.7812 10.4593 10.5452C9.45296 9.9432 8.94386 9.22109 8.13551 8.00119H8.13595C7.36905 6.87239 6.22569 5.25315 4.58566 5.09841C5.65756 5.05397 6.97758 5.42779 7.95718 6.73822L8.03705 6.8451C8.37601 7.29866 8.66069 7.67957 8.91781 8.00062H8.91761C8.97224 8.07364 9.02755 8.1477 9.08361 8.2228C9.12536 8.27869 9.1675 8.33514 9.2101 8.39213C10.0511 9.51717 11.2411 9.56763 11.9325 9.35537C12.5553 9.16416 13.0575 8.55489 12.9506 7.73793C12.9042 7.38327 12.6892 7.09461 12.344 6.8752C11.9887 6.64929 11.4097 6.64949 10.8959 6.76355L11.2379 5.08648C11.827 5.08648 12.5306 5.27019 13.1244 5.64772C13.7285 6.03175 14.2763 6.65802 14.3929 7.54925C14.6019 9.14672 13.5836 10.37 12.3594 10.7459C12.1148 10.8209 11.8339 10.8753 11.5307 10.8965ZM8.02475 13.8876C9.46674 13.8876 10.666 12.7279 10.9147 11.1986C10.4535 11.1736 10.0183 11.0523 9.62933 10.8547C9.60579 11.8212 8.8964 12.5967 8.02472 12.5967C7.13819 12.5967 6.41951 11.7946 6.41951 10.8052C6.41951 10.7103 6.42613 10.6171 6.43886 10.5261L7.68002 9.75953L6.26003 7.98453L6.25269 7.99485C5.54476 8.59339 5.08747 9.54181 5.08747 10.6094C5.08747 12.4199 6.40252 13.8876 8.02475 13.8876Z" fill="white"/>
                  </svg>
                  <span className="text-lg sm:text-xl font-bold text-blue-800 tracking-tight">
                    Cargontainer
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-tint text-brand'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                    {((item.key === 'admin' && adminPendingCount > 0) || (item.key === 'messages' && unreadCount > 0)) && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                        {(item.key === 'admin' ? adminPendingCount : unreadCount) > 9 ? '9+' : (item.key === 'admin' ? adminPendingCount : unreadCount)}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {lang === 'en' ? 'SR' : 'EN'}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="max-w-[120px] truncate text-xs font-medium text-gray-900">
                        {profile?.company_name || user?.data?.email || 'User'}
                      </span>
                      {profile?.role && (
                        <span className="text-[10px] text-gray-400">
                          {formatRoleLabel(profile.role)}
                        </span>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-tint text-brand'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                  {((item.key === 'admin' && adminPendingCount > 0) || (item.key === 'messages' && unreadCount > 0)) && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                      {(item.key === 'admin' ? adminPendingCount : unreadCount) > 9 ? '9+' : (item.key === 'admin' ? adminPendingCount : unreadCount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">{children}</main>
    </div>
  );
}