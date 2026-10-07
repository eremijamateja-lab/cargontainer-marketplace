import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Truck, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AGENCY_SIGNUP_URL, isSupabaseMode } from '@/lib/supabase';

const ROLES = [
  { value: 'forwarder', label: 'Logistics Company', labelSr: 'Logistička kompanija', icon: Container, desc: 'I need carriers to transport my goods (container, truck, rail...)', descSr: 'Tražim prevoznike za transport robe (kontejner, kamion, železnica...)' },
  { value: 'trucking', label: 'Carrier', labelSr: 'Prevoznik', icon: Truck, desc: 'I offer transport services (road, rail...)', descSr: 'Nudim usluge transporta (drumski, železnički...)' },
  { value: 'terminal', label: 'Forwarder — Customs Agent', labelSr: 'Špediter — carinski agent', icon: ShieldCheck, desc: 'I handle customs clearance', descSr: 'Bavim se carinjenjem' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [selectedRole, setSelectedRole] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Supabase mode: the company comes from the shared register (TMS Agency signup).
  // null = still checking, false = this account has no company yet.
  const [sharedCompany, setSharedCompany] = useState<string | false | null>(isSupabaseMode ? null : false);

  useEffect(() => {
    if (!isSupabaseMode) return;
    client.apiCall
      .invoke({ url: '/api/v1/admin/approval-status', method: 'GET' })
      .then((res: any) => {
        const d = res?.data;
        if (d?.status && d.status !== 'no_profile') {
          navigate('/dashboard');
          return;
        }
        if (d?.has_shared_company && d.company_name) {
          setSharedCompany(d.company_name);
          setCompanyName(d.company_name);
        } else {
          setSharedCompany(false);
        }
      })
      .catch(() => setSharedCompany(false));
  }, [navigate]);

  const handleSubmit = async () => {
    if (!selectedRole || !companyName.trim()) {
      toast.error(t('toast.selectRoleAndCompany'));
      return;
    }
    setSubmitting(true);
    try {
      await client.apiCall.invoke({
        url: '/api/v1/profile/me',
        method: 'POST',
        data: {
          role: selectedRole,
          company_name: companyName.trim(),
          display_name: companyName.trim(),
        },
      });
      toast.success(t('toast.profileCreated'));
      navigate(isSupabaseMode ? '/dashboard' : '/pending-approval');
    } catch (err) {
      console.error('Error creating profile:', err);
      toast.error(t('toast.profileCreatedFail'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isSupabaseMode && sharedCompany === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isSupabaseMode && sharedCompany === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {lang === 'sr' ? 'Vaša firma još nije registrovana' : 'Your company is not registered yet'}
          </h1>
          <p className="text-gray-600 mb-6">
            {lang === 'sr'
              ? 'Ovaj nalog nije član nijedne firme. Registrujte firmu (ili zamolite admina firme da vas doda) — posle odobrenja ulazite istim nalogom.'
              : 'This account is not a member of any company. Register your company (or ask your company admin to add you) — after approval you sign in with this same account.'}
          </p>
          <Button
            onClick={() => { window.location.href = `${AGENCY_SIGNUP_URL}/?request=marketplace`; }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {lang === 'sr' ? 'Registrujte svoju firmu' : 'Register your company'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src={lang === 'sr' ? '/assets/cargontainer-logo-sr.png' : '/assets/cargontainer-logo-en.png'}
              alt="Cargontainer"
              className="block w-[240px] h-[56px] object-contain object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('onboarding.title')}</h1>
          <p className="text-gray-500">{t('onboarding.subtitle')}</p>
        </div>

        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">{t('onboarding.selectRole')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((role, idx) => {
                // Center a trailing odd-one-out card under the pair above it
                const isTrailingOdd = ROLES.length % 2 !== 0 && idx === ROLES.length - 1;
                return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    selectedRole === role.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  } ${isTrailingOdd ? 'sm:col-span-2 sm:w-[calc(50%-0.375rem)] sm:mx-auto' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedRole === role.value ? 'bg-blue-600' : 'bg-gray-100'
                    }`}
                  >
                    <role.icon
                      className={`w-5 h-5 ${
                        selectedRole === role.value ? 'text-white' : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        selectedRole === role.value ? 'text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      {lang === 'sr' ? role.labelSr : role.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{lang === 'sr' ? role.descSr : role.desc}</p>
                  </div>
                </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 mb-6">
          <CardContent className="pt-6">
            <Label className="text-gray-700">{t('onboarding.companyName')} *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              readOnly={!!sharedCompany}
              className={`mt-2 border-gray-300 ${sharedCompany ? 'bg-gray-50 text-gray-600' : ''}`}
              placeholder={t('onboarding.companyPlaceholder')}
            />
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !selectedRole || !companyName.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base rounded-xl"
        >
          {submitting ? t('common.loading') : t('onboarding.continue')}
        </Button>
      </div>
    </div>
  );
}