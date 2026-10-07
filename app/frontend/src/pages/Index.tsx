import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Container, Truck, BarChart3, Globe, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { lang, toggleLang } = useLanguage();
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          // Check if user has a profile
          try {
            const profileRes = await client.apiCall.invoke({
              url: '/api/v1/profile/me',
              method: 'GET',
            });
            if (profileRes?.data) {
              // Check approval status before going to dashboard
              try {
                const approvalRes = await client.apiCall.invoke({
                  url: '/api/v1/admin/approval-status',
                  method: 'GET',
                });
                const status = approvalRes?.data?.status;
                if (status === 'pending' || status === 'rejected') {
                  navigate('/pending-approval');
                } else {
                  navigate('/dashboard');
                }
              } catch {
                // If approval check fails, allow access (don't block existing users)
                navigate('/dashboard');
              }
            } else {
              navigate('/onboarding');
            }
          } catch {
            navigate('/onboarding');
          }
          return;
        }
      } catch {
        // Not logged in
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const features = [
    { icon: Container, titleKey: 'landing.feature1.title', descKey: 'landing.feature1.desc' },
    { icon: BarChart3, titleKey: 'landing.feature2.title', descKey: 'landing.feature2.desc' },
    { icon: ShieldCheck, titleKey: 'landing.feature3.title', descKey: 'landing.feature3.desc' },
    { icon: Truck, titleKey: 'landing.feature4.title', descKey: 'landing.feature4.desc' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center shrink-0">
            {!logoError ? (
              <span className="block shrink-0 w-[170px] h-[48px] sm:w-[240px] sm:h-[56px]">
                <img
                  src={lang === 'sr' ? '/assets/cargontainer-logo-sr.png' : '/assets/cargontainer-logo-en.png'}
                  alt="Cargontainer"
                  className="block w-full h-full object-contain object-left"
                  onError={() => setLogoError(true)}
                />
              </span>
            ) : (
              <span className="text-xl font-bold text-blue-600 tracking-tight">Cargontainer</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang === 'en' ? 'Srpski' : 'English'}
            </button>
            <Button onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('nav.login')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px w-12 bg-blue-600" />
              <span className="text-blue-600 text-sm font-medium uppercase tracking-wider">
                {t('landing.subtitle')}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight text-gray-900">
              {t('landing.title')}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-4 leading-relaxed max-w-2xl">
              {t('landing.description')}
            </p>
            <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl">
              {t('landing.description2')}
            </p>
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white text-base px-8 py-6 rounded-xl group"
            >
              {t('landing.cta')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            {t('landing.ctaSection.title')}
          </h2>
          <p className="text-lg text-blue-100 mb-10">
            {t('landing.ctaSection.subtitle')}
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-white hover:bg-gray-50 text-blue-600 text-base px-8 py-6 rounded-xl font-semibold"
          >
            {t('landing.cta')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Container className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-500">© 2026 Cargontainer. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>Belgrade, Serbia</span>
            <span>info@cargontainer.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}