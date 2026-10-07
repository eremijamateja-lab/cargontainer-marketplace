import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useMyThreads } from '@/hooks/useAppQueries';
import Layout from '@/components/Layout';
import ChatThreadView from '@/components/ChatThreadView';
import { MessageCircle, MapPin, Loader2 } from 'lucide-react';

export default function Messages() {
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const currentUserId = String(user?.data?.id || '');

  const { data: threads = [], isLoading } = useMyThreads(!loading && !!profile);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Default to the most recently active thread once threads load
  useEffect(() => {
    if (!selectedKey && threads.length > 0) {
      setSelectedKey(threads[0].thread_key);
    }
  }, [threads, selectedKey]);

  const selected = threads.find((th: any) => th.thread_key === selectedKey) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('chat.title')}</h1>
          <p className="text-gray-500 mt-1">{t('messages.subtitle')}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col sm:flex-row h-[calc(100vh-260px)] min-h-[420px]">
          {/* Thread list */}
          <div className={`w-full sm:w-72 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 overflow-y-auto ${selectedKey ? 'hidden sm:block' : ''}`}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">{t('messages.empty')}</p>
              </div>
            ) : (
              threads.map((th: any) => (
                <button
                  key={th.thread_key}
                  onClick={() => setSelectedKey(th.thread_key)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedKey === th.thread_key ? 'bg-brand-tint' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{th.counterpart_name}</span>
                    {th.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                        {th.unread_count > 9 ? '9+' : th.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{th.route}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{th.last_message}</p>
                </button>
              ))
            )}
          </div>

          {/* Active conversation */}
          <div className={`flex-1 flex flex-col min-w-0 ${selectedKey ? '' : 'hidden sm:flex'}`}>
            {selected ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedKey(null)}
                    className="sm:hidden text-gray-400 hover:text-gray-600 mr-1"
                  >
                    ←
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selected.counterpart_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{selected.route}</p>
                  </div>
                </div>
                <ChatThreadView
                  offerId={selected.offer_id}
                  requestId={selected.kind === 'request' ? selected.request_id : null}
                  carrierUserId={selected.carrier_user_id}
                  currentUserId={currentUserId}
                  active={true}
                  className="flex-1"
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                {t('messages.selectThread')}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
