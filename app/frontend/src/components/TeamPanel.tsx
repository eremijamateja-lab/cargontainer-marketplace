// "Tim na Marketplace-u" (Supabase mode): who in the shared company has Marketplace access.
// Reads/writes public.company_members straight through supabase-js; RLS lets every member read
// the roster and only the company Admin (or platform admin) change it. New colleagues are added
// by the marketplace-invite Edge Function (creates the account when needed). Every change of
// access is logged in public.marketplace_seat_log (DB trigger) for per-user billing later.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Copy, Loader2, UserCircle, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['Admin', 'Prodaja', 'Finansije'];
const roleLabel = (r: string) => t(`team.role${r}`);

export default function TeamPanel({ companyId, myAuthId }: { companyId: string; myAuthId?: string | null }) {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Prodaja' });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mp-team', companyId],
    queryFn: async () => {
      if (!supabase) return null;
      const [members, products, platform] = await Promise.all([
        supabase.from('company_members')
          .select('id,user_id,role,active,marketplace_access,joined_at,profiles(name,email)')
          .eq('company_id', companyId).eq('active', true).order('joined_at'),
        supabase.from('company_products').select('product').eq('company_id', companyId),
        supabase.rpc('is_platform_admin'),
      ]);
      if (members.error) throw members.error;
      return {
        members: (members.data || []) as any[],
        hasTms: (products.data || []).some((p: any) => p.product !== 'marketplace'),
        platformAdmin: !!platform.data,
      };
    },
    enabled: !!supabase && !!companyId,
  });

  const members = data?.members || [];
  const me = members.find((m) => m.user_id === myAuthId);
  const canManage = !!data?.platformAdmin || me?.role === 'Admin';
  const seats = members.filter((m) => m.marketplace_access).length;
  const refresh = () => qc.invalidateQueries({ queryKey: ['mp-team', companyId] });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error: err } = await supabase!.from('company_members').update(patch).eq('id', id).eq('company_id', companyId);
      if (err) throw err;
    },
    onSuccess: () => { toast.success(t('toast.saved')); refresh(); },
    onError: (e: any) => toast.error(e?.message || t('team.failed')),
  });

  const invite = useMutation({
    mutationFn: async () => {
      const { data: res, error: err } = await supabase!.functions.invoke('marketplace-invite', {
        body: { company_id: companyId, name: form.name.trim(), email: form.email.trim(), role: form.role },
      });
      if (err) {
        // The function answers errors as JSON {error}; surface that text, not "non-2xx status".
        let msg = err.message;
        try { msg = (await (err as any).context?.json())?.error || msg; } catch { /* keep generic */ }
        throw new Error(msg);
      }
      return res as { email: string; password: string | null; existing: boolean };
    },
    onSuccess: (res) => {
      if (res.password) setCreated({ email: res.email, password: res.password });
      else toast.success(t('team.addedExisting'));
      setForm({ name: '', email: '', role: 'Prodaja' });
      setShowInvite(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || t('team.failed')),
  });

  return (
    <Card id="team">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> {t('team.title')}
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t('team.seats').replace('{n}', String(seats))}</span>
          </CardTitle>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowInvite((v) => !v)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> {t('team.invite')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {created && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm space-y-2">
            <p className="text-emerald-900">{t('team.createdHint').replace('{email}', created.email)}</p>
            <div className="flex items-center gap-2">
              <code className="bg-white border border-emerald-200 rounded px-2 py-1 font-mono">{created.password}</code>
              <Button size="sm" variant="outline" className="h-7" onClick={() => { navigator.clipboard?.writeText(created.password); toast.success(t('team.copied')); }}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-emerald-800">{t('team.createdOnce')}</p>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCreated(null)}>{t('common.close')}</Button>
          </div>
        )}

        {showInvite && canManage && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberName')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberEmail')} *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="kolega@firma.com" className="mt-1 bg-white" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberRole')}</Label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-600">{t('team.inviteHint').replace('{n}', String(seats + 1))}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => invite.mutate()} disabled={invite.isPending || !form.email.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                {invite.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                {t('team.invite')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        )}

        {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
        {error && <p className="text-sm text-red-600">{(error as any)?.message || t('team.failed')}</p>}

        {members.length > 0 && (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {members.map((m) => {
              const self = m.user_id === myAuthId;
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                  <UserCircle className="w-8 h-8 text-blue-600 bg-blue-50 rounded-full p-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {m.profiles?.name || m.profiles?.email || '—'}{self && <span className="text-gray-400 font-normal"> ({t('team.you')})</span>}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{m.profiles?.email}</div>
                  </div>
                  {canManage && !self && !data?.hasTms ? (
                    <select value={m.role} onChange={(e) => update.mutate({ id: m.id, patch: { role: e.target.value } })}
                      className="text-xs rounded-md border border-gray-200 bg-white px-2 py-1">
                      {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{roleLabel(m.role)}</span>
                  )}
                  <label className="flex items-center gap-2 text-xs text-gray-600" title={self ? t('team.selfHint') : ''}>
                    <Switch
                      checked={!!m.marketplace_access}
                      disabled={!canManage || self || update.isPending}
                      onCheckedChange={(on) => update.mutate({ id: m.id, patch: { marketplace_access: on } })}
                    />
                    {m.marketplace_access ? t('team.hasAccess') : t('team.noAccess')}
                  </label>
                  {canManage && !self && !data?.hasTms && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-400 hover:text-red-600"
                      onClick={() => { if (confirm(t('team.removeConfirm'))) update.mutate({ id: m.id, patch: { active: false } }); }}>
                      {t('team.remove')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-500">{data?.hasTms ? t('team.tmsHint') : t('team.mpOnlyHint')}</p>
      </CardContent>
    </Card>
  );
}
