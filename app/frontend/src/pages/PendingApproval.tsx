import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Clock, XCircle, LogOut } from 'lucide-react';
import { supabaseSignOut } from '@/lib/supabase';

export default function PendingApproval() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [status, setStatus] = useState<string>('pending');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const u = await client.auth.me();
        if (!u?.data) {
          navigate('/');
          return;
        }

        const approvalRes = await client.apiCall.invoke({
          url: '/api/v1/admin/approval-status',
          method: 'GET',
        });

        if (approvalRes?.data) {
          const { status: s, company_name } = approvalRes.data;
          setStatus(s);
          setCompanyName(company_name || '');

          // If approved, redirect to dashboard
          if (s === 'approved') {
            navigate('/dashboard');
            return;
          }
        }
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleLogout = async () => {
    await supabaseSignOut();
    // Same fix as Layout.tsx: clear the local JWT directly instead of a
    // bare client-side navigate(), which left the stale token in place
    // and could bounce the user straight back to this pending screen.
    try {
      localStorage.removeItem('token');
      localStorage.setItem('isLougOutManual', 'true');
    } catch {
      // localStorage unavailable — fall through to navigation anyway
    }
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isRejected = status === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {isRejected ? (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {t('approval.rejectedTitle')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('approval.rejectedMessage')}
            </p>
            {companyName && (
              <p className="text-sm text-gray-500 mb-6">
                {t('company.title')}: <span className="font-medium">{companyName}</span>
              </p>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = 'mailto:office@cargontainer.com'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('approval.contactSupport')}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('common.close')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {t('approval.pendingTitle')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('approval.pendingMessage')}
            </p>
            {companyName && (
              <p className="text-sm text-gray-500 mb-6">
                {t('company.title')}: <span className="font-medium">{companyName}</span>
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('common.close')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}