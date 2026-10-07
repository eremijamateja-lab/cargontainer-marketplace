import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ChatThreadView from '@/components/ChatThreadView';
import { t } from '@/lib/i18n';

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Either an offer-scoped negotiation thread…
  offerId?: number | null;
  // …or a pre-offer inquiry thread on a request (carrierUserId identifies
  // which carrier's thread this is — omit it as a carrier viewing your own).
  requestId?: number | null;
  carrierUserId?: string | null;
  currentUserId: string;
  counterpartName?: string;
}

/** Quick-access chat modal, used from Marketplace/Requests/Offers cards.
 * For the full conversation history across every thread, see the
 * dedicated inbox at /messages (Messages.tsx) — both share ChatThreadView. */
export default function ChatPanel({
  open,
  onOpenChange,
  offerId = null,
  requestId = null,
  carrierUserId = null,
  currentUserId,
  counterpartName,
}: ChatPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-gray-100">
          <DialogTitle className="text-base">
            {counterpartName || t('chat.title')}
          </DialogTitle>
        </DialogHeader>
        <ChatThreadView
          offerId={offerId}
          requestId={requestId}
          carrierUserId={carrierUserId}
          currentUserId={currentUserId}
          active={open}
          className="h-80"
        />
      </DialogContent>
    </Dialog>
  );
}
