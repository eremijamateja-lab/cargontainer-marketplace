import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/Layout';
import { t } from '@/lib/i18n';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Building2, Pencil, Save, X, Users, UserCheck, UserX, UserMinus, Trash2 } from 'lucide-react';
import PilotCleanup from '@/pages/PilotCleanup';
import { formatCompanyRoles, parseCompanyRoles } from '@/lib/formatCompanyRoles';
import { COMPANY_ROLES } from '@/lib/constants';
import { toast } from 'sonner';
import { AGENCY_SIGNUP_URL, isSupabaseMode } from '@/lib/supabase';

type Tab = 'pending' | 'all' | 'cleanup';

interface EditForm {
  company_name: string;
  company_roles: string[];
  country: string;
  city: string;
  vat_number: string;
  company_type: string;
  approval_status: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  address: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    company_name: '',
    company_roles: [],
    country: '',
    city: '',
    vat_number: '',
    company_type: '',
    approval_status: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    address: '',
  });

  const [viewingMembersCompanyId, setViewingMembersCompanyId] = useState<number | null>(null);

  // Redirect non-admin users AFTER render via useEffect
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [loading, isAdmin, navigate]);

  const { data: pendingCompanies = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-companies'],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/pending-companies',
        method: 'GET',
      });
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    },
    enabled: isAdmin,
  });

  const { data: allCompanies = [], isLoading: allLoading } = useQuery({
    queryKey: ['admin', 'all-companies'],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/all-companies',
        method: 'GET',
      });
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    },
    enabled: isAdmin && activeTab === 'all',
  });

  const { data: pendingMembers = [], isLoading: pendingMembersLoading } = useQuery({
    queryKey: ['admin', 'pending-members'],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/pending-members',
        method: 'GET',
      });
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    },
    enabled: isAdmin,
  });

  const { data: companyMembersData, isLoading: membersLoading } = useQuery({
    queryKey: ['admin', 'company-members', viewingMembersCompanyId],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: `/api/v1/admin/company-members/${viewingMembersCompanyId}`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      return data;
    },
    enabled: isAdmin && viewingMembersCompanyId !== null,
  });

  const memberStatusMutation = useMutation({
    mutationFn: async (payload: { member_id: number; action: string }) => {
      return client.apiCall.invoke({
        url: '/api/v1/admin/member-status',
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'company-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      toast.success(t('admin.memberStatusChanged'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return client.apiCall.invoke({
        url: '/api/v1/admin/approve',
        method: 'POST',
        data: { company_id: companyId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return client.apiCall.invoke({
        url: '/api/v1/admin/reject',
        method: 'POST',
        data: { company_id: companyId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (payload: { company_id: number } & Partial<EditForm>) => {
      return client.apiCall.invoke({
        url: '/api/v1/admin/update-company',
        method: 'POST',
        data: {
          company_id: payload.company_id,
          company_name: payload.company_name || undefined,
          company_roles: payload.company_roles ? JSON.stringify(payload.company_roles) : undefined,
          country: payload.country || undefined,
          city: payload.city || undefined,
          vat_number: payload.vat_number || undefined,
          company_type: payload.company_type || undefined,
          approval_status: payload.approval_status || undefined,
          email: payload.email || undefined,
          phone: payload.phone || undefined,
          website: payload.website || undefined,
          description: payload.description || undefined,
          address: payload.address || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setEditingCompanyId(null);
    },
  });

  const startEditing = (company: any) => {
    const roles = parseCompanyRoles(company.company_roles);
    setEditForm({
      company_name: company.company_name || '',
      company_roles: roles,
      country: company.country || '',
      city: company.city || '',
      vat_number: company.vat_number || '',
      company_type: company.company_type || '',
      approval_status: company.approval_status || 'approved',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      description: company.description || '',
      address: company.address || '',
    });
    setEditingCompanyId(company.id);
  };

  const cancelEditing = () => {
    setEditingCompanyId(null);
  };

  const saveEditing = (companyId: number) => {
    updateCompanyMutation.mutate({
      company_id: companyId,
      ...editForm,
    });
  };

  const toggleEditRole = (roleValue: string) => {
    setEditForm((prev) => ({
      ...prev,
      company_roles: prev.company_roles.includes(roleValue)
        ? prev.company_roles.filter((r) => r !== roleValue)
        : [...prev.company_roles, roleValue],
    }));
  };

  // Show loading while auth is being determined
  if (loading) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  // While redirecting non-admin users, show nothing (useEffect will navigate)
  if (!isAdmin) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t('admin.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />{t('admin.rejected')}</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1" />{t('admin.pending')}</Badge>;
    }
  };

  const companies = activeTab === 'pending' ? pendingCompanies : allCompanies;
  const isLoadingData = activeTab === 'pending' ? pendingLoading : allLoading;

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-blue-600 text-white' : ''}
          >
            <Clock className="w-4 h-4 mr-1" />
            {t('admin.pendingCompanies')}
            {(pendingCompanies.length + pendingMembers.length) > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingCompanies.length + pendingMembers.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className={activeTab === 'all' ? 'bg-blue-600 text-white' : ''}
          >
            <Building2 className="w-4 h-4 mr-1" />
            {t('admin.allCompanies')}
          </Button>
          <Button
            variant={activeTab === 'cleanup' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('cleanup')}
            className={activeTab === 'cleanup' ? 'bg-amber-600 text-white' : ''}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t('admin.pilotCleanup')}
          </Button>
        </div>

        {/* Pilot Cleanup Tab */}
        {activeTab === 'cleanup' && <PilotCleanup />}

        {/* Pending Members — new team members waiting on approval, across all companies */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> {t('admin.pendingMembers')}
              {pendingMembers.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingMembers.length}
                </span>
              )}
            </h2>
            {pendingMembersLoading ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              </div>
            ) : pendingMembers.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">{t('admin.noPendingMembers')}</p>
            ) : (
              <div className="space-y-2">
                {pendingMembers.map((m: any) => (
                  <div key={m.id} className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{m.display_name}</span>
                      <span className="text-gray-400"> · {m.email}</span>
                      <div className="text-xs text-gray-500">
                        {t('admin.companyLabel')}: {m.company_name} · {t('admin.roleLabel')}: {m.member_role}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'approve' })}
                        disabled={memberStatusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t('admin.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'reject' })}
                        disabled={memberStatusMutation.isPending}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('admin.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 pt-2">
              <Building2 className="w-4 h-4" /> {t('admin.pendingCompanies')}
            </h2>
          </div>
        )}

        {/* Content */}
        {activeTab !== 'cleanup' && (isLoadingData ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {activeTab === 'pending' ? t('admin.noPending') : t('admin.noCompanies')}
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company: any) => (
              <div
                key={company.id}
                className="bg-white border rounded-lg p-4"
              >
                {editingCompanyId === company.id ? (
                  /* ===== EDIT MODE ===== */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {t('admin.editCompany')}: {company.company_name}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEditing(company.id)}
                          disabled={updateCompanyMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          {t('common.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('company.companyName')}</Label>
                        <Input
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">PIB / VAT</Label>
                        <Input
                          value={editForm.vat_number}
                          onChange={(e) => setEditForm({ ...editForm, vat_number: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('admin.country')}</Label>
                        <Input
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('company.city')}</Label>
                        <Input
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Company Roles — multi-select */}
                    <div>
                      <Label className="text-xs">{t('admin.companyRoles')}</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {COMPANY_ROLES.map((cr) => {
                          const active = editForm.company_roles.includes(cr.value);
                          return (
                            <button
                              key={cr.value}
                              onClick={() => toggleEditRole(cr.value)}
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
                    </div>

                    {/* Approval Status */}
                    <div>
                      <Label className="text-xs">{t('admin.approvalStatus')}</Label>
                      <select
                        value={editForm.approval_status}
                        onChange={(e) => setEditForm({ ...editForm, approval_status: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="pending">{t('admin.pending')}</option>
                        <option value="approved">{t('admin.approved')}</option>
                        <option value="rejected">{t('admin.rejected')}</option>
                      </select>
                    </div>

                    {/* Contact fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('admin.contactEmail')}</Label>
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="mt-1"
                          type="email"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('admin.phone')}</Label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('admin.website')}</Label>
                        <Input
                          value={editForm.website}
                          onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                          className="mt-1"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('admin.address')}</Label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{t('admin.description')}</Label>
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  /* ===== VIEW MODE ===== */
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {company.company_name || '—'}
                        </h3>
                        {getStatusBadge(company.approval_status || 'approved')}
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        <p>
                          {t('admin.companyType')}: {company.company_type || '—'}
                          {(() => {
                            const rolesStr = formatCompanyRoles(company.company_roles);
                            return rolesStr !== '—' ? ` (${rolesStr})` : '';
                          })()}
                        </p>
                        <p>
                          {t('admin.country')}: {company.country || '—'} • {company.city || '—'}
                        </p>
                        {company.vat_number && company.vat_number !== '—' && (
                          <p>
                            PIB/VAT: {company.vat_number}
                          </p>
                        )}
                        {company.email && company.email !== '—' && (
                          <p>
                            Email: {company.email}
                          </p>
                        )}
                        {company.phone && company.phone !== '—' && (
                          <p>
                            Tel: {company.phone}
                          </p>
                        )}
                        {company.user_name && company.user_name !== '—' && (
                          <p>
                            {t('admin.registeredBy')}: {company.user_name}
                          </p>
                        )}
                        {company.user_email && company.user_email !== '—' && (
                          <p className="text-xs text-gray-500">
                            {company.user_email}
                          </p>
                        )}
                        {company.created_at && (
                          <p className="text-xs text-gray-400">
                            {t('admin.registeredAt')}: {new Date(company.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* View Members button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingMembersCompanyId(company.id)}
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {t('admin.members')}
                      </Button>
                      {/* Edit button — always available for admin */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(company)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        {t('admin.editCompany')}
                      </Button>

                      {isSupabaseMode && company.approval_status !== 'approved' ? (
                        // Supabase mode: approval = the company has the Marketplace product on an active
                        // plan, set in TMS Agency's Platform admin (shared company register).
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(AGENCY_SIGNUP_URL, '_blank', 'noopener')}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {lang === 'sr' ? 'Odobri u TMS Agency' : 'Approve in TMS Agency'}
                        </Button>
                      ) : (
                        <>
                        {company.approval_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(company.id)}
                              disabled={approveMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('admin.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(company.id)}
                              disabled={rejectMutation.isPending}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {t('admin.reject')}
                            </Button>
                          </>
                        )}
                        {company.approval_status === 'rejected' && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(company.id)}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('admin.approve')}
                          </Button>
                        )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Company Members Modal */}
        {viewingMembersCompanyId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {t('admin.members')}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setViewingMembersCompanyId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : companyMembersData?.items?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('company.noMembers')}</p>
              ) : (
                <div>
                  {/* Status counts */}
                  {companyMembersData?.counts && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {t('admin.activeMembers')}: {companyMembersData.counts.active}
                      </Badge>
                      <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {t('admin.pendingMembers')}: {companyMembersData.counts.pending}
                      </Badge>
                      <Badge className="bg-gray-50 text-gray-600 border-gray-200">
                        {t('admin.inactiveMembers')}: {companyMembersData.counts.inactive}
                      </Badge>
                      <Badge className="bg-red-50 text-red-700 border-red-200">
                        {t('admin.rejectedMembers')}: {companyMembersData.counts.rejected}
                      </Badge>
                    </div>
                  )}

                  {/* Members table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase">
                      <div className="col-span-3">{t('company.memberName')}</div>
                      <div className="col-span-3">{t('company.memberEmail')}</div>
                      <div className="col-span-2">{t('company.memberRole')}</div>
                      <div className="col-span-2">{t('company.memberStatus')}</div>
                      <div className="col-span-2">{t('common.actions')}</div>
                    </div>
                    {companyMembersData?.items?.map((m: any) => (
                      <div key={m.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 items-center hover:bg-gray-50">
                        <div className="sm:col-span-3 text-sm font-medium text-gray-900 truncate">
                          {m.display_name || '—'}
                        </div>
                        <div className="sm:col-span-3 text-sm text-gray-600 truncate">
                          {m.email || m.user_id}
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                            {m.member_role}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            m.member_status === 'active' ? 'bg-green-50 text-green-700' :
                            m.member_status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                            m.member_status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {m.member_status ? t(`company.memberStatus${m.member_status.charAt(0).toUpperCase() + m.member_status.slice(1)}`) : t('company.memberStatusActive')}
                          </span>
                        </div>
                        <div className="sm:col-span-2 flex gap-1 flex-wrap">
                          {m.member_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'approve' })}
                                disabled={memberStatusMutation.isPending}
                                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                              >
                                <UserCheck className="w-3 h-3 mr-0.5" />
                                {t('admin.memberApprove')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'reject' })}
                                disabled={memberStatusMutation.isPending}
                                className="h-7 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <UserX className="w-3 h-3 mr-0.5" />
                                {t('admin.memberReject')}
                              </Button>
                            </>
                          )}
                          {m.member_status === 'active' && m.member_role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'deactivate' })}
                              disabled={memberStatusMutation.isPending}
                              className="h-7 px-2 text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              <UserMinus className="w-3 h-3 mr-0.5" />
                              {t('admin.memberDeactivate')}
                            </Button>
                          )}
                          {m.member_status === 'inactive' && (
                            <Button
                              size="sm"
                              onClick={() => memberStatusMutation.mutate({ member_id: m.id, action: 'reactivate' })}
                              disabled={memberStatusMutation.isPending}
                              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <UserCheck className="w-3 h-3 mr-0.5" />
                              {t('admin.memberReactivate')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}