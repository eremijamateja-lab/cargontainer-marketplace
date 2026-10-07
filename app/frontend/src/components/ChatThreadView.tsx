import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useOfferMessages,
  useSendOfferMessage,
  useRequestMessages,
  useSendRequestMessage,
} from '@/hooks/useAppQueries';
import { Send, Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n';

interface ChatThreadViewProps {
  // Either an offer-scoped negotiation thread…
  offerId?: number | null;
  // …or a pre-offer inquiry thread on a request (carrierUserId identifies
  // which carrier's thread this is — omit it as a carrier viewing your own).
  requestId?: number | null;
  carrierUserId?: string | null;
  currentUserId: string;
  active: boolean;
  className?: string;
}

/** The message list + composer, shared by the ChatPanel modal and the
 * full inbox page (Messages.tsx) so both stay in sync. */
export default function ChatThreadView({
  offerId = null,
  requestId = null,
  carrierUserId = null,
  currentUserId,
  active,
  className = 'h-80',
}: ChatThreadViewProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isRequestMode = !offerId && !!requestId;

  const offerQuery = useOfferMessages(offerId, active && !isRequestMode);
  const requestQuery = useRequestMessages(requestId, carrierUserId, active && isRequestMode);
  const { data: messages = [], isLoading } = isRequestMode ? requestQuery : offerQuery;

  const offerSend = useSendOfferMessage(offerId);
  const requestSend = useSendRequestMessage(requestId, carrierUserId);
  const sendMessage = isRequestMode ? requestSend : offerSend;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, active]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate(body, {
      onSuccess: () => setDraft(''),
    });
  };

  return (
    <>
      <div ref={scrollRef} className={`${className} overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50`}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 text-center px-6">
            {t('chat.empty')}
          </div>
        ) : (
          messages.map((m: any) => {
            const isOwn = m.sender_user_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isOwn
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                }`}>
                  {!isOwn && m.sender_name && (
                    <div className="text-[11px] font-semibold text-gray-500 mb-0.5">{m.sender_name}</div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-100 shrink-0">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t('chat.placeholder')}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand max-h-24"
        />
        <Button
          onClick={handleSend}
          disabled={!draft.trim() || sendMessage.isPending}
          className="bg-brand hover:bg-brand/90 text-white shrink-0"
          size="icon"
        >
          {sendMessage.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </>
  );
}
