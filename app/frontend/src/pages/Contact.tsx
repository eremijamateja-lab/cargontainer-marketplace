import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MapPin, Phone, CheckCircle, Container } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const u = await client.auth.me();
        if (!u?.data) { navigate('/'); return; }
        setUser(u);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    setSent(true);
    toast.success(t('contact.sent'));
  };

  const handleLogout = () => navigate('/');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('contact.title')}</h1>
          <p className="text-gray-500 mt-1">{t('contact.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Form */}
          <Card className="bg-white border-gray-200 lg:col-span-2">
            <CardContent className="p-6">
              {sent ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg text-gray-900 font-medium">{t('contact.sent')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700">{t('contact.name')} *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="mt-1 border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">{t('contact.email')} *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="mt-1 border-gray-300"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('contact.company')}</Label>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="mt-1 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700">{t('contact.message')} *</Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="mt-1 border-gray-300"
                      rows={5}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                    {t('contact.send')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('contact.info.title')}</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Container className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Cargontainer d.o.o.</p>
                    <p className="text-xs text-gray-500 mt-0.5">Container Transport Platform</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('contact.info.address')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('contact.info.email')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t('contact.info.phone')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}