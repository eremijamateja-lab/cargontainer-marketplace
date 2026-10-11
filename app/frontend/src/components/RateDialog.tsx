// Rate the other side of a delivered transport (once per company per transport).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

export function useShipmentRating(shipmentId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['shipment-rating', shipmentId],
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({ url: `/api/v1/trust/ratings/shipment/${shipmentId}`, method: 'GET' });
      return res?.data ?? res;
    },
    enabled: enabled && !!shipmentId,
    staleTime: 60_000,
    retry: false,
  });
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5" aria-label={`${i}`}>
          <Star className={`w-6 h-6 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </span>
  );
}

export default function RateDialog({ shipment, role, open, onOpenChange }: {
  shipment: any; role: 'forwarder' | 'carrier'; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [s, setS] = useState([0, 0, 0]);
  const [comment, setComment] = useState('');
  const labels = role === 'forwarder'
    ? [t('rate.punctuality'), t('rate.communication'), t('rate.cargoCondition')]
    : [t('rate.payment'), t('rate.communication'), t('rate.orderAccuracy')];
  const save = useMutation({
    mutationFn: async () => client.apiCall.invoke({
      url: '/api/v1/trust/ratings', method: 'POST',
      data: { shipment_id: shipment.id, s1: s[0], s2: s[1], s3: s[2], comment },
    }),
    onSuccess: () => {
      toast.success(t('rate.thanks'));
      qc.invalidateQueries({ queryKey: ['shipment-rating', shipment.id] });
      qc.invalidateQueries({ queryKey: ['trust'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || t('rate.failed')),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{role === 'forwarder' ? t('rate.titleCarrier') : t('rate.titleForwarder')}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500">{shipment.tracking_number} · {shipment.origin} → {shipment.destination}</p>
        <div className="space-y-2 mt-2">
          {labels.map((l, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">{l}</span>
              <StarInput value={s[i]} onChange={(v) => setS((p) => p.map((x, j) => (j === i ? v : x)))} />
            </div>
          ))}
        </div>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
          placeholder={t('rate.commentPlaceholder')} className="mt-2" />
        <p className="text-[11px] text-gray-400">{t('rate.anonHint')}</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={s.some((x) => !x) || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{t('rate.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "⭐ Oceni" on a delivered transport, or "✓ Ocenjeno" once this company rated it. */
export function RateButton({ shipment }: { shipment: any }) {
  const [open, setOpen] = useState(false);
  const { data } = useShipmentRating(shipment.id, shipment.status === 'delivered');
  if (!data?.role) return null;
  if (data.mine) {
    return <span className="text-[11px] text-emerald-700 font-medium">✓ {t('rate.done')} ({data.mine.overall.toFixed(1)}★)</span>;
  }
  if (!data.can_rate) return null;
  return (
    <>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setOpen(true)}>
        <Star className="w-3.5 h-3.5 mr-1 fill-amber-400 text-amber-400" />{data.role === 'forwarder' ? t('rate.buttonCarrier') : t('rate.buttonForwarder')}
      </Button>
      {open && <RateDialog shipment={shipment} role={data.role} open={open} onOpenChange={setOpen} />}
    </>
  );
}
