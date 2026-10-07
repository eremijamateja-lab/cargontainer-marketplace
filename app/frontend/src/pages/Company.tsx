import { useState, useEffect } from 'react';
import { t, formatMemberRoleLabel, formatCapabilityLabel, formatCompanyRoleLabel, formatVehicleTypeLabel, formatTransportModeLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { parseCompanyRoles } from '@/lib/formatCompanyRoles';
import { useMyCompany, useCompanyMembers, useCreateCompany, useUpdateCompany, useInviteMember, useRemoveMember } from '@/hooks/useAppQueries';
import {
  COMPANY_ROLES,
  COMPANY_ROLE_MAP,
  COMPANY_TYPE_MAP,
  COUNTRIES,
  COUNTRY_MAP,
  countryFlag,
  CAPABILITY_TRANSPORT_MODES,
  CAPABILITY_VEHICLE_TYPES,
  CAPABILITY_TRANSPORT_CATEGORIES,
} from '@/lib/constants';
import Layout from '@/components/Layout';
import Flag from '@/components/Flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Globe, Phone, Mail, MapPin, Edit, Save, Shield, Briefcase, UserCircle, UserPlus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Capabilities {
  transport_modes: string[];
  vehicle_types: string[];
  transport_categories: string[];
  customs_capability: boolean;
  countries_covered: string[];
  main_routes: string;
  customs_offices: string;
  service_regions: string;
}

const EMPTY_CAPABILITIES: Capabilities = {
  transport_modes: [],
  vehicle_types: [],
  transport_categories: [],
  customs_capability: false,
  countries_covered: [],
  main_routes: '',
  customs_offices: '',
  service_regions: '',
};

export default function Company() {
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const [editing, setEditing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    company_name: '',
    company_type: '',
    company_roles: [] as string[],
    country: '',
    city: '',
    vat_number: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    description: '',
    capabilities: { ...EMPTY_CAPABILITIES } as Capabilities,
  });

  // Add Member state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('operations');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: companyData, isLoading: companyLoading } = useMyCompany(!loading && !!profile);
  const { data: members } = useCompanyMembers(!loading && !!profile?.company_id);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();

  const hasCompany = companyData && companyData.id;

  useEffect(() => {
    if (hasCompany) {
      const rawCaps = companyData.capabilities || {};
      // Migrate old format to new format
      const caps: Capabilities = {
        transport_modes: Array.isArray(rawCaps.transport_modes) ? rawCaps.transport_modes : [],
        vehicle_types: Array.isArray(rawCaps.vehicle_types)
          ? rawCaps.vehicle_types
          : (rawCaps.vehicle_types ? rawCaps.vehicle_types.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        transport_categories: Array.isArray(rawCaps.transport_categories)
          ? rawCaps.transport_categories
          : (rawCaps.transport_categories ? rawCaps.transport_categories.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        customs_capability: rawCaps.customs_capability || rawCaps.customs_services || false,
        countries_covered: Array.isArray(rawCaps.countries_covered)
          ? rawCaps.countries_covered
          : (rawCaps.countries_covered ? rawCaps.countries_covered.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
        main_routes: rawCaps.main_routes || '',
        customs_offices: rawCaps.customs_offices || '',
        service_regions: rawCaps.service_regions || '',
      };
      // Parse company_roles safely using shared helper
      let roles: string[] = parseCompanyRoles(companyData.company_roles);
      // Migrate old single company_type to roles if no roles exist
      if (roles.length === 0 && companyData.company_type) {
        const typeToRole: Record<string, string> = {
          carrier: 'carrier',
          freight_forwarder: 'freight_forwarder',
          customs_broker: 'customs_agent',
          terminal: 'terminal_depot',
          rail_operator: 'intermodal_rail',
        };
        roles = [typeToRole[companyData.company_type] || companyData.company_type];
      }
      setForm({
        company_name: companyData.company_name || '',
        company_type: companyData.company_type || '',
        company_roles: roles,
        country: companyData.country || '',
        city: companyData.city || '',
        vat_number: companyData.vat_number || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        website: companyData.website || '',
        address: companyData.address || '',
        description: companyData.description || '',
        capabilities: caps,
      });
    } else if (profile) {
      setForm((prev) => ({
        ...prev,
        company_name: (profile as any).company_name || '',
        email: user?.data?.email || '',
      }));
    }
  }, [hasCompany, companyData, profile, user]);

  const handleSave = async () => {
    if (!form.company_name.trim() || form.company_roles.length === 0 || !form.country || !form.city || !form.email || !form.phone) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    // Send company_roles as JSON string and keep company_type as first role for backward compat
    const payload = {
      ...form,
      company_type: form.company_roles[0] || '',
      company_roles: JSON.stringify(form.company_roles),
    };
    try {
      if (hasCompany) {
        await updateCompany.mutateAsync(payload);
      } else {
        await createCompany.mutateAsync(payload);
      }
      setEditing(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Toggle company role in multi-select
  const toggleCompanyRole = (value: string) => {
    setForm((prev) => {
      const roles = prev.company_roles.includes(value)
        ? prev.company_roles.filter((r) => r !== value)
        : [...prev.company_roles, value];
      return { ...prev, company_roles: roles };
    });
  };

  // Toggle helpers for multi-select arrays
  const toggleCapabilityArray = (field: keyof Capabilities, value: string) => {
    setForm((prev) => {
      const arr = prev.capabilities[field] as string[];
      const newArr = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, capabilities: { ...prev.capabilities, [field]: newArr } };
    });
  };

  if (loading || companyLoading) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  // User is company admin if: they have no company yet (creating), OR their member_role is 'admin',
  // OR they are the company creator (fallback for old records before member_role was added)
  const isCompanyAdmin = !hasCompany || profile?.member_role === 'admin' || (!profile?.member_role && !!profile?.company_id);
  const showForm = editing || !hasCompany;

  // Verified legal fields are locked for normal approved users (non-platform-admin) —
  // but only once they actually hold a verified value. Onboarding only collects
  // company_name + role, so country/city/vat_number start empty even on an already
  // -approved company; locking an empty field would make it impossible to ever fill in.
  const isApprovedCompany = hasCompany && (companyData?.approval_status === 'approved' || !companyData?.approval_status);
  const isFieldsLocked = isApprovedCompany && !isAdmin;
  const isFieldLocked = (fieldName: string) =>
    isFieldsLocked && !!(companyData as any)?.[fieldName];

  const MEMBER_ROLES = [
    { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    { value: 'operations', label: 'Operations', color: 'bg-green-100 text-green-700' },
    { value: 'sales', label: 'Sales', color: 'bg-purple-100 text-purple-700' },
    { value: 'driver', label: 'Driver', color: 'bg-orange-100 text-orange-700' },
  ];

  const getRoleColor = (role: string) => {
    const found = MEMBER_ROLES.find((r) => r.value === role);
    return found?.color || 'bg-gray-100 text-gray-600';
  };

  const handleAddMember = () => {
    if (!inviteEmail.trim()) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    inviteMember.mutate(
      { email: inviteEmail.trim(), member_role: inviteRole },
      {
        onSuccess: () => {
          setInviteName('');
          setInviteEmail('');
          setInvitePhone('');
          setInviteRole('operations');
          setShowInviteForm(false);
        },
      }
    );
  };

  const renderMembersSection = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> {t('company.members')}
            {members && members.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{members.length}</span>
            )}
          </CardTitle>
          {isCompanyAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              {t('company.addMember')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Member Form */}
        {showInviteForm && isCompanyAdmin && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <h4 className="text-sm font-medium text-gray-800">{t('company.addMember')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberName')}</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={t('company.placeholderFullName')}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberEmail')} *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('company.placeholderEmail')}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberPhone')}</Label>
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+381..."
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('company.memberRole')} *</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {MEMBER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{formatMemberRoleLabel(r.value)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddMember}
                disabled={inviteMember.isPending || !inviteEmail.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {inviteMember.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> {t('company.adding')}</>
                ) : (
                  <><UserPlus className="w-3.5 h-3.5 mr-1.5" /> {t('company.addMember')}</>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInviteForm(false)}
              >
                {t('common.cancel')}
              </Button>
            </div>
            {inviteRole === 'driver' && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                🚛 <strong>{t('company.driverLimitedAccess')}:</strong> {t('company.driverAccessDescription')}
              </p>
            )}
          </div>
        )}

        {/* Members Table */}
        {members && members.length > 0 ? (
          <div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">{t('company.memberName')}</div>
              <div className="col-span-3">{t('company.memberEmail')}</div>
              <div className="col-span-2">{t('company.memberRole')}</div>
              <div className="col-span-2">{t('company.memberStatus')}</div>
              <div className="col-span-1"></div>
            </div>
            {/* Table Rows */}
            {members.map((m: any) => (
              <div key={m.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 items-center hover:bg-gray-50 transition-colors">
                {/* Name */}
                <div className="sm:col-span-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.display_name || t('company.unnamed')}</div>
                    <div className="text-xs text-gray-500 sm:hidden">{m.role}</div>
                  </div>
                </div>
                {/* Email */}
                <div className="sm:col-span-3 text-sm text-gray-600 truncate pl-10 sm:pl-0">
                  {m.email || m.user_email || '—'}
                </div>
                {/* Role Badge */}
                <div className="sm:col-span-2 pl-10 sm:pl-0">
                  {isCompanyAdmin && m.member_role !== 'admin' ? (
                    <select
                      value={m.member_role || 'member'}
                      onChange={(e) => {
                        // Update member role via API
                        inviteMember.mutate(
                          { email: m.role || '', member_role: e.target.value },
                          { onSuccess: () => toast.success(t('toast.saved')) }
                        );
                      }}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getRoleColor(m.member_role)}`}
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{formatMemberRoleLabel(r.value)}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(m.member_role)}`}>
                      {formatMemberRoleLabel(m.member_role || 'member')}
                    </span>
                  )}
                </div>
                {/* Status */}
                <div className="sm:col-span-2 pl-10 sm:pl-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    (m.member_status || 'active') === 'active' ? 'bg-green-50 text-green-700' :
                    (m.member_status || 'active') === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                    (m.member_status || 'active') === 'rejected' ? 'bg-red-50 text-red-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {t(`company.memberStatus${(m.member_status || 'active').charAt(0).toUpperCase() + (m.member_status || 'active').slice(1)}`)}
                  </span>
                </div>
                {/* Actions */}
                <div className="sm:col-span-1 pl-10 sm:pl-0 flex justify-end">
                  {isCompanyAdmin && m.member_role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Remove this member from the company?')) {
                          removeMember.mutate(m.user_id);
                        }
                      }}
                      disabled={removeMember.isPending}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Pending helper text */}
          {members.some((m: any) => m.member_status === 'pending') && (
            <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
              ⏳ {t('company.memberPendingHelper')}
            </p>
          )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('company.noMembers')}</p>
            {isCompanyAdmin && (
              <p className="text-xs mt-1 text-gray-400">Click &quot;{t('company.addMember')}&quot; to add your first team member</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('company.title')}</h1>
            {hasCompany && (
              <p className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                <span>
                  {Array.isArray(form.company_roles) && form.company_roles.length > 0
                    ? form.company_roles.map((r) => COMPANY_ROLE_MAP[r]?.emoji || COMPANY_TYPE_MAP[r]?.emoji || '').join(' ')
                    : (COMPANY_TYPE_MAP[companyData?.company_type]?.emoji || '')}
                  {' '}
                  {Array.isArray(form.company_roles) && form.company_roles.length > 0
                    ? form.company_roles.map((r) => t(`companyRole.${r}`)).join(', ')
                    : (COMPANY_TYPE_MAP[companyData?.company_type]?.label || companyData?.company_type || '')}
                  {' · '}
                </span>
                {companyData.country && <Flag code={companyData.country} className="w-4 h-3" />}
                {' '}{COUNTRY_MAP[companyData.country] || companyData.country}
                {companyData.city ? `, ${companyData.city}` : ''}
              </p>
            )}
          </div>
          {hasCompany && isCompanyAdmin && !editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4 mr-1.5" /> {t('company.editCompany')}
            </Button>
          )}
        </div>

        {/* Company Form / View */}
        {showForm ? (
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> {t('company.companyName')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Locked fields helper text — only when some field actually has a locked (already-verified) value */}
                {(isFieldLocked('company_name') || isFieldLocked('country') || isFieldLocked('city') || isFieldLocked('vat_number')) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      🔒 {t('company.verifiedFieldsLocked')}
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <Label>{t('company.companyName')} *</Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      className={`mt-1 ${isFieldLocked('company_name') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isFieldLocked('company_name')}
                    />
                    {isFieldLocked('company_name') && <p className="text-xs text-gray-400 mt-0.5">🔒 {t('company.fieldLocked')}</p>}
                  </div>
                  <div>
                    <Label>{t('company.rolesLabel')} *</Label>
                    {companyData?.approval_status === 'approved' && !isAdmin ? (
                      <>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.company_roles.map((roleKey: string) => {
                            const cr = COMPANY_ROLES.find((c) => c.value === roleKey);
                            return (
                              <span
                                key={roleKey}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200 cursor-not-allowed"
                              >
                                {cr?.emoji || '🏢'} {t(`companyRole.${roleKey}`)}
                              </span>
                            );
                          })}
                        </div>
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          🔒 {t('company.rolesLocked')}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mt-0.5 mb-2">{t('company.rolesHelper')}</p>
                        <div className="flex flex-wrap gap-2">
                          {COMPANY_ROLES.map((cr) => {
                            const active = form.company_roles.includes(cr.value);
                            return (
                              <button
                                key={cr.value}
                                onClick={() => toggleCompanyRole(cr.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  active
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {cr.emoji} {t(`companyRole.${cr.value}`)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>{t('company.country')} *</Label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      disabled={isFieldLocked('country')}
                      className={`mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${isFieldLocked('country') ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    >
                      <option value="">{t('common.selectCountry')}</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{countryFlag(c.code)} {c.name}</option>
                      ))}
                    </select>
                    {isFieldLocked('country') && <p className="text-xs text-gray-400 mt-0.5">🔒 {t('company.fieldLocked')}</p>}
                  </div>
                  <div>
                    <Label>{t('company.city')} *</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={`mt-1 ${isFieldLocked('city') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isFieldLocked('city')}
                    />
                    {isFieldLocked('city') && <p className="text-xs text-gray-400 mt-0.5">🔒 {t('company.fieldLocked')}</p>}
                  </div>
                  <div>
                    <Label>{t('company.vatNumber')} *</Label>
                    <Input
                      value={form.vat_number}
                      onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                      className={`mt-1 ${isFieldLocked('vat_number') ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      disabled={isFieldLocked('vat_number')}
                      placeholder="e.g. RS123456789"
                    />
                    {isFieldLocked('vat_number') && <p className="text-xs text-gray-400 mt-0.5">🔒 {t('company.fieldLocked')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>{t('company.email')} *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t('company.phone')} *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="+381..." />
                  </div>
                  <div>
                    <Label>{t('company.website')}</Label>
                    <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="mt-1" placeholder="https://..." />
                  </div>
                </div>

                <div>
                  <Label>{t('company.address')}</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>{t('company.description')}</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Capabilities — New Structure */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> {t('company.capabilities')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Transport Modes (FTL/LTL) */}
                <div>
                  <Label className="text-sm font-medium">{t('company.transportModes')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAPABILITY_TRANSPORT_MODES.map((tm) => {
                      const active = form.capabilities.transport_modes.includes(tm.value);
                      return (
                        <button
                          key={tm.value}
                          onClick={() => toggleCapabilityArray('transport_modes', tm.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {active ? '☑' : '☐'} {formatCapabilityLabel(tm.value)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vehicle Types */}
                <div>
                  <Label className="text-sm font-medium">{t('company.supportedVehicleTypes')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAPABILITY_VEHICLE_TYPES.map((vt) => {
                      const active = form.capabilities.vehicle_types.includes(vt.value);
                      return (
                        <button
                          key={vt.value}
                          onClick={() => toggleCapabilityArray('vehicle_types', vt.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {active ? '☑' : '☐'} {formatVehicleTypeLabel(vt.value)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transport Categories */}
                <div>
                  <Label className="text-sm font-medium">{t('company.transportCategories')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CAPABILITY_TRANSPORT_CATEGORIES.map((tc) => {
                      const active = form.capabilities.transport_categories.includes(tc.value);
                      return (
                        <button
                          key={tc.value}
                          onClick={() => toggleCapabilityArray('transport_categories', tc.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {active ? '☑' : '☐'} {formatCapabilityLabel(tc.value)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customs Capability */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.capabilities.customs_capability}
                    onChange={(e) => setForm({ ...form, capabilities: { ...form.capabilities, customs_capability: e.target.checked } })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label className="cursor-pointer">{t('company.customsCapability')}</Label>
                </div>

                {/* Countries Covered */}
                <div>
                  <Label className="text-sm font-medium">{t('company.countriesCovered')}</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {COUNTRIES.map((c) => {
                      const active = form.capabilities.countries_covered.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          onClick={() => toggleCapabilityArray('countries_covered', c.code)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Flag code={c.code} className="w-3.5 h-2.5" /> {c.code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Routes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('company.mainRoutes')}</Label>
                    <Input
                      value={form.capabilities.main_routes}
                      onChange={(e) => setForm({ ...form, capabilities: { ...form.capabilities, main_routes: e.target.value } })}
                      className="mt-1"
                      placeholder="e.g. Koper-Belgrade, Rijeka-Budapest"
                    />
                  </div>
                  <div>
                    <Label>{t('company.serviceRegions')}</Label>
                    <Input
                      value={form.capabilities.service_regions}
                      onChange={(e) => setForm({ ...form, capabilities: { ...form.capabilities, service_regions: e.target.value } })}
                      className="mt-1"
                      placeholder="e.g. Balkans, Central Europe"
                    />
                  </div>
                </div>

                {/* Customs Offices — shown if customs capability is enabled */}
                {form.capabilities.customs_capability && (
                  <div>
                    <Label>{t('company.customsOffices')}</Label>
                    <Input
                      value={form.capabilities.customs_offices}
                      onChange={(e) => setForm({ ...form, capabilities: { ...form.capabilities, customs_offices: e.target.value } })}
                      className="mt-1"
                      placeholder="e.g. Batrovci, Horgoš, Kelebija"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={createCompany.isPending || updateCompany.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-1.5" />
                {hasCompany ? t('company.save') : t('company.create')}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </Button>
              )}
            </div>

            {/* Members section — also visible in edit mode for existing companies */}
            {hasCompany && renderMembersSection()}
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            {/* Company Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{companyData.company_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="inline-flex items-center gap-1.5">{companyData.country && <Flag code={companyData.country} className="w-4 h-3" />} {COUNTRY_MAP[companyData.country] || companyData.country}, {companyData.city}</span>
                    </div>
                    {companyData.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{companyData.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span>{t('company.vatNumber')}: {companyData.vat_number}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${companyData.email}`} className="text-blue-600 hover:underline">{companyData.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${companyData.phone}`} className="text-blue-600 hover:underline">{companyData.phone}</a>
                    </div>
                    {companyData.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{companyData.website}</a>
                      </div>
                    )}
                  </div>
                </div>
                {companyData.description && (
                  <p className="mt-4 text-sm text-gray-600 border-t pt-4">{companyData.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Capabilities View */}
            {companyData.capabilities && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> {t('company.capabilities')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transport Modes */}
                  {form.capabilities.transport_modes.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">{t('company.transportModes')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.capabilities.transport_modes.map((m) => (
                          <Badge key={m} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            {formatCapabilityLabel(m)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Types */}
                  {form.capabilities.vehicle_types.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">{t('company.supportedVehicleTypes')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.capabilities.vehicle_types.map((v) => (
                          <Badge key={v} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {formatVehicleTypeLabel(v)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transport Categories */}
                  {form.capabilities.transport_categories.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">{t('company.transportCategories')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.capabilities.transport_categories.map((c) => (
                          <Badge key={c} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {formatCapabilityLabel(c)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customs */}
                  {form.capabilities.customs_capability && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        🛃 {t('company.customsCapability')}
                      </Badge>
                      {form.capabilities.customs_offices && (
                        <span className="text-xs text-gray-500">({form.capabilities.customs_offices})</span>
                      )}
                    </div>
                  )}

                  {/* Countries */}
                  {form.capabilities.countries_covered.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">{t('company.countriesCovered')}</div>
                      <div className="flex flex-wrap gap-1">
                        {form.capabilities.countries_covered.map((code) => (
                          <Flag key={code} code={code} className="w-4 h-3" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Routes & Regions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {form.capabilities.main_routes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">{t('company.mainRoutes')}</div>
                        <div className="font-medium text-xs mt-0.5">{form.capabilities.main_routes}</div>
                      </div>
                    )}
                    {form.capabilities.service_regions && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">{t('company.serviceRegions')}</div>
                        <div className="font-medium text-xs mt-0.5">{form.capabilities.service_regions}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Members — always visible in view mode */}
            {renderMembersSection()}
          </div>
        )}
      </div>
    </Layout>
  );
}