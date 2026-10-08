import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { COUNTRIES } from '@/lib/constants';
import type { Corridor } from '@/lib/corridors';
import { useCorridors, useSaveCorridors } from '@/hooks/useAppQueries';
import {
  disablePush, enablePush, getPushSubscription, isIosNotInstalled, isPushSupported,
  isSoundOn, playAlertSound, sendTestPush, setSoundOn,
} from '@/lib/push';
import Flag from '@/components/Flag';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Bell, Loader2, Plus, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const ANY = 'any';

function CountrySelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger className="h-9 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{t('alerts.any')}</SelectItem>
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="inline-flex items-center gap-1.5"><Flag code={c.code} className="w-4 h-3" /> {c.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AlertsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: saved = [], isLoading } = useCorridors(open);
  const save = useSaveCorridors();
  const [rows, setRows] = useState<Corridor[]>([]);
  const [sound, setSound] = useState(isSoundOn());
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (open) setRows((saved as Corridor[]).map((c) => ({ ...c })));
  }, [open, saved]);

  useEffect(() => {
    if (!open) return;
    getPushSubscription().then((s) => setPushOn(!!s)).catch(() => setPushOn(false));
  }, [open]);

  const update = (i: number, patch: Partial<Corridor>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const togglePush = async (on: boolean) => {
    setPushBusy(true);
    try {
      if (on) {
        const res = await enablePush();
        if (res === 'denied') toast.error(t('alerts.denied'));
        else if (res === 'unsupported') toast.error(t('alerts.unsupported'));
        setPushOn(res === 'ok');
      } else {
        await disablePush();
        setPushOn(false);
      }
    } catch {
      toast.error(t('alerts.saveFailed'));
    } finally {
      setPushBusy(false);
    }
  };

  const test = async () => {
    try {
      await sendTestPush();
      toast.success(t('alerts.testSent'));
    } catch {
      toast.error(t('alerts.saveFailed'));
    }
  };

  const supported = isPushSupported();
  const iosHint = isIosNotInstalled();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            {t('alerts.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Push on this device */}
        <section className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{t('alerts.pushTitle')}</p>
              <p className="text-xs text-gray-500">{t('alerts.pushHelp')}</p>
            </div>
            {pushBusy ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
            ) : (
              <Switch checked={pushOn} onCheckedChange={togglePush} disabled={!supported && !pushOn} />
            )}
          </div>
          {iosHint && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">{t('alerts.iosHint')}</p>}
          {!supported && !iosHint && <p className="text-xs text-gray-500">{t('alerts.unsupported')}</p>}
          {pushOn && (
            <Button size="sm" variant="outline" onClick={test}>
              {t('alerts.test')}
            </Button>
          )}
        </section>

        {/* Sound */}
        <section className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5"><Volume2 className="w-4 h-4" />{t('alerts.soundTitle')}</p>
              <p className="text-xs text-gray-500">{t('alerts.soundHelp')}</p>
            </div>
            <Switch
              checked={sound}
              onCheckedChange={(v) => { setSound(v); setSoundOn(v); if (v) playAlertSound(); }}
            />
          </div>
        </section>

        {/* Corridors */}
        <section className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{t('alerts.routesTitle')}</p>
            <p className="text-xs text-gray-500">{t('alerts.routesHelp')}</p>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            rows.map((row, i) => (
              <div key={i} className="rounded-lg bg-gray-50 border border-gray-200 p-2 space-y-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <CountrySelect value={row.origin_country} onChange={(v) => update(i, { origin_country: v })} />
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <CountrySelect value={row.destination_country} onChange={(v) => update(i, { destination_country: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <Switch checked={row.both_directions} onCheckedChange={(v) => update(i, { both_directions: v })} />
                    {t('alerts.bothDirections')}
                  </label>
                  <Button size="sm" variant="ghost" className="text-red-600 h-8" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <div className="flex flex-wrap gap-2 justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRows((r) => [...r, { origin_country: 'RS', destination_country: null, both_directions: true }])}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('alerts.addRoute')}
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(
                  rows
                    .filter((r) => r.origin_country || r.destination_country)
                    .map(({ origin_country, destination_country, both_directions }) => ({ origin_country, destination_country, both_directions }))
                )
              }
            >
              {save.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {t('alerts.save')}
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
