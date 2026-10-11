// Phase 3 "poverenje": ✔ verified, ⭐ rating (from 3 ratings), 🚚 completed transports, member since.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BadgeCheck, Loader2, Star, Truck } from 'lucide-react';

export interface TrustInfo {
  verified: boolean;
  member_since: string | null;
  rating: number | null;
  rating_count: number;
  completed: number;
}

/** Shared company uuid of an actor id "<auth uid>:<company uuid>" (null in local mode). */
export function companyOf(actor?: string | null): string | null {
  const i = (actor || '').indexOf(':');
  return i > 0 ? (actor as string).slice(i + 1) : null;
}

/** One request for every company on the page (sorted ids = stable cache key). */
export function useTrust(actors: (string | null | undefined)[]) {
  const ids = Array.from(new Set(actors.map(companyOf).filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ['trust', ids.join(',')],
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({ url: '/api/v1/trust/lookup', method: 'POST', data: { company_ids: ids } });
      return (res?.data ?? res ?? {}) as Record<string, TrustInfo>;
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

function Stars({ value, size = 'w-3.5 h-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function ReviewsDialog({ companyId, name, open, onOpenChange }: { companyId: string; name?: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['trust-reviews', companyId],
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({ url: `/api/v1/trust/companies/${companyId}/reviews`, method: 'GET' });
      return res?.data ?? res;
    },
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('trust.reviewsTitle')}{name ? ` — ${name}` : ''}</DialogTitle>
        </DialogHeader>
        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        {data && !data.visible && <p className="text-sm text-gray-500">{t('trust.fewRatings')}</p>}
        {data?.visible && (
          <div className="space-y-3">
            {data.items.map((r: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.overall} />
                  <span className="text-[11px] text-gray-400">
                    {r.rater_role === 'forwarder' ? t('trust.byForwarder') : t('trust.byCarrier')} · {(r.created_at || '').slice(0, 10)}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mt-1.5">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function TrustBadges({ actor, info, name }: { actor?: string | null; info?: TrustInfo; name?: string }) {
  const [open, setOpen] = useState(false);
  const companyId = companyOf(actor);
  if (!companyId || !info) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px]">
      {info.verified && (
        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium" title={t('trust.verifiedHint')}>
          <BadgeCheck className="w-3.5 h-3.5" /> {t('trust.verified')}
        </span>
      )}
      {info.rating != null ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-0.5 text-amber-700 hover:underline">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {info.rating.toFixed(1)} ({info.rating_count})
        </button>
      ) : info.rating_count > 0 ? (
        <span className="text-gray-400" title={t('trust.fewRatings')}>
          ⭐ {info.rating_count} {t('trust.ratingsShort')}
        </span>
      ) : null}
      {info.completed > 0 && (
        <span className="inline-flex items-center gap-0.5 text-gray-500">
          <Truck className="w-3.5 h-3.5" /> {info.completed} {t('trust.completed')}
        </span>
      )}
      {info.member_since && <span className="text-gray-400">· {t('trust.memberSince')} {info.member_since.slice(0, 4)}</span>}
      {open && <ReviewsDialog companyId={companyId} name={name} open={open} onOpenChange={setOpen} />}
    </span>
  );
}

/** "Vaša reputacija" — the logged-in company's own badge, ratings and anonymous comments. */
export function MyReputation({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['trust', 'me'],
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({ url: '/api/v1/trust/me', method: 'GET' });
      return res?.data ?? res;
    },
    staleTime: 60_000,
    retry: false,
  });
  if (!data?.company_id) return null;
  const min = data.min_shown || 3;
  const groups = [
    { g: data.by_forwarders, title: t('trust.asCarrier'), labels: [t('rate.punctuality'), t('rate.communication'), t('rate.cargoCondition')] },
    { g: data.by_carriers, title: t('trust.asForwarder'), labels: [t('rate.payment'), t('rate.communication'), t('rate.orderAccuracy')] },
  ].filter((x) => x.g);
  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {t('trust.myTitle')}
        </h3>
        <TrustBadges actor={`x:${data.company_id}`} info={data} />
      </div>
      {!data.verified && <p className="text-xs text-gray-500 mt-2">{t('trust.notVerifiedHint')}</p>}
      {data.rating_count === 0 ? (
        <p className="text-sm text-gray-500 mt-2">{t('trust.noRatingsYet')}</p>
      ) : data.rating == null ? (
        <p className="text-sm text-gray-600 mt-2">
          ⭐ {data.rating_count} {t('trust.ratingsShort')} — {t('trust.shownFrom').replace('{n}', String(min))}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold text-gray-900">{data.rating.toFixed(1)}</span>
            <Stars value={data.rating} size="w-4 h-4" />
            <span className="text-xs text-gray-500">({data.rating_count} {t('trust.ratingsShort')})</span>
          </div>
          {!compact && groups.map(({ g, title, labels }) => (
            <div key={title}>
              <div className="text-xs font-medium text-gray-500 mb-1">{title} · {g.count}</div>
              {g.s ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {labels.map((l, i) => (
                    <div key={l} className="bg-gray-50 rounded-md px-2.5 py-1.5 flex items-center justify-between text-sm">
                      <span className="text-gray-600">{l}</span>
                      <span className="font-medium text-gray-900">{g.s[i].toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">{t('trust.shownFrom').replace('{n}', String(min))}</p>
              )}
            </div>
          ))}
          {!compact && data.reviews?.visible && data.reviews.items.some((r: any) => r.comment) && (
            <button type="button" onClick={() => setOpen(true)} className="text-sm text-blue-600 hover:underline">
              {t('trust.seeComments')}
            </button>
          )}
        </div>
      )}
      {open && <ReviewsDialog companyId={data.company_id} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
