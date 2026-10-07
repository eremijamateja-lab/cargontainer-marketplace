import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Container, Globe, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AGENCY_SIGNUP_URL, isSupabaseMode, signInWithPassword } from '@/lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { lang, toggleLang } = useLanguage();
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (isSupabaseMode) {
      // Same account as Cargontainer TMS Agency / TMS Carrier
      try {
        await signInWithPassword(email.trim(), password);
        window.location.href = '/';
      } catch (err: any) {
        const invalid = /invalid login credentials/i.test(err?.message || '');
        setError(
          invalid
            ? (lang === 'en' ? 'Wrong email or password.' : 'Pogrešan email ili lozinka.')
            : (err?.message || (lang === 'en' ? 'Something went wrong. Please try again.' : 'Došlo je do greške. Pokušajte ponovo.'))
        );
        setSubmitting(false);
      }
      return;
    }

    try {
      const endpoint = mode === 'register' ? '/api/v1/local-auth/register' : '/api/v1/local-auth/login';
      const body = mode === 'register'
        ? { email, password, name }
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || (lang === 'en' ? 'Something went wrong. Please try again.' : 'Došlo je do greške. Pokušajte ponovo.'));
        setSubmitting(false);
        return;
      }

      // Store token in localStorage (same key the SDK uses)
      localStorage.setItem('token', data.token);
      localStorage.setItem('isLougOutManual', 'false');

      // Navigate to home - the app will detect the token and redirect appropriately
      window.location.href = '/';
    } catch {
      setError(lang === 'en' ? 'Network error. Please check your connection.' : 'Greška u mreži. Proverite konekciju.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center shrink-0 cursor-pointer" onClick={() => navigate('/')}>
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
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'en' ? 'Back to home' : 'Nazad na početnu'}
          </button>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Container className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mode === 'login'
                  ? (lang === 'en' ? 'Welcome back' : 'Dobrodošli nazad')
                  : (lang === 'en' ? 'Create your account' : 'Kreirajte nalog')}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {mode === 'login'
                  ? (lang === 'en' ? 'Sign in to access your logistics dashboard' : 'Prijavite se da pristupite logističkom panelu')
                  : (lang === 'en' ? 'Join the B2B logistics network' : 'Pridružite se B2B logističkoj mreži')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    {lang === 'en' ? 'Full Name' : 'Ime i prezime'}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === 'en' ? 'e.g. Marko Petrović' : 'npr. Marko Petrović'}
                    required
                    className="mt-1.5"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {lang === 'en' ? 'Email address' : 'Email adresa'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {lang === 'en' ? 'Password' : 'Lozinka'}
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? (lang === 'en' ? 'Min. 6 characters' : 'Min. 6 karaktera') : '••••••••'}
                    required
                    minLength={mode === 'register' ? 6 : undefined}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-medium"
              >
                {submitting
                  ? (lang === 'en' ? 'Please wait...' : 'Molimo sačekajte...')
                  : mode === 'login'
                    ? (lang === 'en' ? 'Sign In' : 'Prijavite se')
                    : (lang === 'en' ? 'Create Account' : 'Kreiraj nalog')}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center text-sm text-gray-500">
              {isSupabaseMode ? (
                <>
                  {lang === 'en' ? 'New company? ' : 'Nova firma? '}
                  <a
                    href={`${AGENCY_SIGNUP_URL}/?request=marketplace`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {lang === 'en' ? 'Register your company' : 'Registrujte svoju firmu'}
                  </a>
                </>
              ) : mode === 'login' ? (
                <>
                  {lang === 'en' ? "Don't have an account? " : 'Nemate nalog? '}
                  <button
                    onClick={() => { setMode('register'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {lang === 'en' ? 'Register' : 'Registrujte se'}
                  </button>
                </>
              ) : (
                <>
                  {lang === 'en' ? 'Already have an account? ' : 'Već imate nalog? '}
                  <button
                    onClick={() => { setMode('login'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {lang === 'en' ? 'Sign In' : 'Prijavite se'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            {isSupabaseMode
              ? (lang === 'en'
                ? 'One account for Cargontainer Marketplace, TMS Agency and TMS Carrier.'
                : 'Jedan nalog za Cargontainer Marketplace, TMS Agency i TMS Carrier.')
              : (lang === 'en'
                ? 'By creating an account, your company profile will be reviewed before activation.'
                : 'Kreiranjem naloga, profil vaše kompanije će biti pregledan pre aktivacije.')}
          </p>
        </div>
      </div>
    </div>
  );
}