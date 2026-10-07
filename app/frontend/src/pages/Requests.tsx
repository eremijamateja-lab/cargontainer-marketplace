import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, formatTransportCategoryLabel, formatAdditionalServiceLabel, formatVehicleTypeLabel, formatTransportModeShortLabel, formatCustomsServiceTypeLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useMyRequests, useCreateRequest, useDeleteRequest, useUpdateRequest, useRequestThreads } from '@/hooks/useAppQueries';
import Layout from '@/components/Layout';
import ChatPanel from '@/components/ChatPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import Flag from '@/components/Flag';
import { Plus, MapPin, ArrowRight, Package, Trash2, ExternalLink, Loader2, X, Pencil, ShieldCheck, SlidersHorizontal, ChevronDown, MessageCircle } from 'lucide-react';
import {
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_MAP,
  TRANSPORT_MODES,
  TRANSPORT_MODE_MAP,
  VEHICLE_TYPES,
  VEHICLE_TYPE_MAP,
  CUSTOMS_SERVICE_TYPES,
  CUSTOMS_SERVICE_MAP,
  ADDITIONAL_SERVICES,
  SERVICE_MAP,
  parseServices,
  serializeServices,
  COUNTRIES,
  COUNTRY_MAP,
  CONTAINER_TYPES,
  CONTAINER_SHORT,
} from '@/lib/constants';

const EMPTY_FORM = {
  origin: '',
  destination: '',
  origin_country: '',
  destination_country: '',
  transport_category: 'container',
  transport_mode: '',
  vehicle_type: '',
  customs_service_type: '',
  customs_office: '',
  invoice_ref: '',
  additional_services: [] as string[],
  container_type: '40HC',
  container_count: 1,
  cargo_description: '',
  weight_kg: '',
  preferred_date: '',
  deadline_date: '',
  special_requirements: '',
};

type FormState = typeof EMPTY_FORM;

export default function Requests() {
  const navigate = useNavigate();
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM });
  const [editRequestId, setEditRequestId] = useState<number | null>(null);
  const [editRequestStatus, setEditRequestStatus] = useState('');

  // Filters — dropdown-based
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Carrier inquiry threads (pre-offer chat) for one of my own requests
  const [threadsRequest, setThreadsRequest] = useState<any>(null);
  const [chatThread, setChatThread] = useState<{ requestId: number; carrierUserId: string; carrierName?: string } | null>(null);
  const { data: threads = [], isLoading: threadsLoading } = useRequestThreads(threadsRequest?.id || null, !!threadsRequest);

  const isForwarder = profile?.role === 'forwarder';

  // React Query hooks
  const { data: requests = [], isLoading: dataLoading, isFetching } = useMyRequests(!!profile && isForwarder);
  const createMutation = useCreateRequest();
  const deleteMutation = useDeleteRequest();
  const updateMutation = useUpdateRequest();

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let result = requests;
    if (filterCategory) {
      result = result.filter((r: any) => r.transport_category === filterCategory);
    }
    if (filterCountry) {
      result = result.filter(
        (r: any) => r.origin_country === filterCountry || r.destination_country === filterCountry
      );
    }
    if (filterStatus) {
      result = result.filter((r: any) => r.status === filterStatus);
    }
    if (filterMode) {
      result = result.filter((r: any) => r.transport_mode === filterMode);
    }
    return result;
  }, [requests, filterCategory, filterCountry, filterStatus, filterMode]);

  const usedCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const r of requests as any[]) {
      if (r.origin_country) codes.add(r.origin_country);
      if (r.destination_country) codes.add(r.destination_country);
    }
    return Array.from(codes).sort();
  }, [requests]);

  const usedStatuses = useMemo(() => {
    const statuses = new Set<string>();
    for (const r of requests as any[]) {
      if (r.status) statuses.add(r.status);
    }
    return Array.from(statuses).sort();
  }, [requests]);

  const hasActiveFilters = filterCategory || filterCountry || filterStatus || filterMode;

  // Redirect non-forwarders
  if (profile && !isForwarder) {
    navigate('/dashboard');
    return null;
  }

  const toggleService = (value: string) => {
    setForm((prev) => ({
      ...prev,
      additional_services: prev.additional_services.includes(value)
        ? prev.additional_services.filter((s) => s !== value)
        : [...prev.additional_services, value],
    }));
  };

  const toggleEditService = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      additional_services: prev.additional_services.includes(value)
        ? prev.additional_services.filter((s) => s !== value)
        : [...prev.additional_services, value],
    }));
  };

  const handleSubmit = async () => {
    const isCustoms = form.transport_category === 'customs_only';
    if (!form.origin.trim()) return;
    if (!isCustoms && !form.destination.trim()) return;
    if (isCustoms && !form.customs_service_type) return;

    const title = isCustoms && !form.destination.trim()
      ? `🛃 ${form.origin.trim()}`
      : `${form.origin.trim()} → ${form.destination.trim()}`;
    const payload: Record<string, any> = {
      title,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      container_type: form.container_type,
      container_count: form.container_count || 1,
      status: 'published',
    };

    if (form.origin_country) payload.origin_country = form.origin_country;
    if (form.destination_country) payload.destination_country = form.destination_country;
    if (form.transport_category) payload.transport_category = form.transport_category;
    if (form.transport_mode) payload.transport_mode = form.transport_mode;
    if (form.vehicle_type) payload.vehicle_type = form.vehicle_type;
    if (form.customs_service_type) payload.customs_service_type = form.customs_service_type;
    if (form.customs_office) payload.customs_office = form.customs_office;
    if (form.invoice_ref) payload.invoice_ref = form.invoice_ref;
    if (form.additional_services.length > 0) {
      payload.additional_services = serializeServices(form.additional_services);
    }
    if (form.cargo_description.trim()) payload.cargo_description = form.cargo_description.trim();
    if (form.weight_kg && parseFloat(form.weight_kg) > 0) payload.weight_kg = parseFloat(form.weight_kg);
    if (form.preferred_date) payload.preferred_date = form.preferred_date;
    if (form.deadline_date) payload.deadline_date = form.deadline_date;
    if (form.special_requirements.trim()) payload.special_requirements = form.special_requirements.trim();
    if (profile?.company_name) payload.user_company = profile.company_name;
    if (profile?.role) payload.user_role = profile.role;

    createMutation.mutate(payload, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Edit request
  const canEdit = (status: string) => {
    return ['published', 'draft', 'open', 'offers_received'].includes(status);
  };

  const isLocked = (status: string) => {
    return ['in_progress', 'delivered', 'cancelled'].includes(status);
  };

  const openEditDialog = (req: any) => {
    setEditRequestId(req.id);
    setEditRequestStatus(req.status);
    setEditForm({
      origin: req.origin || '',
      destination: req.destination || '',
      origin_country: req.origin_country || '',
      destination_country: req.destination_country || '',
      transport_category: req.transport_category || 'container',
      transport_mode: req.transport_mode || '',
      vehicle_type: req.vehicle_type || '',
      customs_service_type: req.customs_service_type || '',
      customs_office: req.customs_office || '',
      invoice_ref: req.invoice_ref || '',
      additional_services: parseServices(req.additional_services),
      container_type: req.container_type || '40HC',
      container_count: req.container_count || 1,
      cargo_description: req.cargo_description || '',
      weight_kg: req.weight_kg ? String(req.weight_kg) : '',
      preferred_date: req.preferred_date || '',
      deadline_date: req.deadline_date || '',
      special_requirements: req.special_requirements || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    const isEditCustoms = editForm.transport_category === 'customs_only';
    if (!editRequestId || !editForm.origin.trim()) return;
    if (!isEditCustoms && !editForm.destination.trim()) return;
    if (isEditCustoms && !editForm.customs_service_type) return;

    const title = isEditCustoms && !editForm.destination.trim()
      ? `🛃 ${editForm.origin.trim()}`
      : `${editForm.origin.trim()} → ${editForm.destination.trim()}`;
    const payload: Record<string, any> = {
      title,
      origin: editForm.origin.trim(),
      destination: editForm.destination.trim(),
      origin_country: editForm.origin_country || null,
      destination_country: editForm.destination_country || null,
      transport_category: editForm.transport_category || 'container',
      transport_mode: editForm.transport_mode || null,
      vehicle_type: editForm.vehicle_type || null,
      customs_service_type: editForm.customs_service_type || null,
      customs_office: editForm.customs_office || null,
      invoice_ref: editForm.invoice_ref || null,
      additional_services: editForm.additional_services.length > 0
        ? serializeServices(editForm.additional_services)
        : '',
      container_type: editForm.container_type,
      container_count: editForm.container_count || 1,
      cargo_description: editForm.cargo_description.trim() || null,
      weight_kg: editForm.weight_kg && parseFloat(editForm.weight_kg) > 0 ? parseFloat(editForm.weight_kg) : null,
      preferred_date: editForm.preferred_date || null,
      deadline_date: editForm.deadline_date || null,
      special_requirements: editForm.special_requirements.trim() || null,
    };

    updateMutation.mutate(
      { id: editRequestId, data: payload },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditRequestId(null);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600 border-gray-200',
      published: 'bg-blue-50 text-blue-700 border-blue-200',
      open: 'bg-blue-50 text-blue-700 border-blue-200',
      offers_received: 'bg-amber-50 text-amber-700 border-amber-200',
      accepted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      in_transit: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      in_progress: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      cancelled: 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (loading || (dataLoading && requests.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Shared form fields component — dynamic based on transport type
  const renderFormFields = (
    formData: FormState,
    setFormData: React.Dispatch<React.SetStateAction<FormState>>,
    toggleSvc: (v: string) => void,
    readOnly = false
  ) => {
    const isContainer = formData.transport_category === 'container';
    const isTruck = formData.transport_category === 'truck_van';
    const isRail = formData.transport_category === 'rail';
    const isOversized = formData.transport_category === 'oversized';
    const isCustomsOnly = formData.transport_category === 'customs_only';

    return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Transport Category */}
      <div className="sm:col-span-2">
        <Label className="text-gray-700">{t('requests.form.transportType')}</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TRANSPORT_TYPES.map((tt) => (
            <button
              key={tt.value}
              type="button"
              disabled={readOnly}
              onClick={() => setFormData({
                ...formData,
                transport_category: tt.value,
                transport_mode: '',
                vehicle_type: '',
                customs_service_type: '',
                customs_office: '',
                invoice_ref: '',
                // container_type doubles as the pallets/volume free-text field
                // (truck) and wagon type (rail) — must not carry over a stale
                // value (e.g. "40HC") between categories.
                container_type: tt.value === 'container' ? '40HC' : '',
                container_count: 1,
              })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                formData.transport_category === tt.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span>{tt.emoji}</span>
              <span>{formatTransportCategoryLabel(tt.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Services — NOT shown for customs_only */}
      {!isCustomsOnly && (
        <div className="sm:col-span-2">
          <Label className="text-gray-700">{t('requests.form.additionalServices')}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ADDITIONAL_SERVICES.map((svc) => {
              const isActive = formData.additional_services.includes(svc.value);
              return (
                <button
                  key={svc.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggleSvc(svc.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                  } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="text-base">{isActive ? '☑' : '☐'}</span>
                  <span>{svc.emoji}</span>
                  <span>{formatAdditionalServiceLabel(svc.value)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t('requests.form.additionalServicesHint')}
          </p>
        </div>
      )}

      {/* ─── Customs Only Fields ─── */}
      {isCustomsOnly && (
        <>
          <div className="sm:col-span-2">
            <Label className="text-gray-700">{t('requests.form.customsServiceType')} *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CUSTOMS_SERVICE_TYPES.map((cs) => (
                <button
                  key={cs.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setFormData({ ...formData, customs_service_type: cs.value })}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.customs_service_type === cs.value
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                  } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span>{formatCustomsServiceTypeLabel(cs.value)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.customsOffice')}</Label>
            <Input
              value={formData.customs_office}
              onChange={(e) => setFormData({ ...formData, customs_office: e.target.value })}
              className="mt-1 border-gray-300"
              placeholder="e.g. Batrovci, Horgoš"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.invoiceRef')}</Label>
            <Input
              value={formData.invoice_ref}
              onChange={(e) => setFormData({ ...formData, invoice_ref: e.target.value })}
              className="mt-1 border-gray-300"
              placeholder="e.g. INV-2024-001"
              disabled={readOnly}
            />
          </div>
        </>
      )}

      {/* Origin + Country (with autocomplete) */}
      <div>
        <Label className="text-gray-700">{isCustomsOnly ? t('requests.form.customsOffice') + ' / ' + t('requests.form.origin') : t('requests.form.origin')} *</Label>
        <LocationAutocomplete
          value={formData.origin}
          onChange={(v) => setFormData({ ...formData, origin: v })}
          onLocationSelect={(loc) => setFormData({ ...formData, origin: loc.location_name, origin_country: loc.country_code })}
          countryCode={formData.origin_country || undefined}
          placeholder={isCustomsOnly ? 'e.g. Batrovci customs' : t('requests.originPlaceholder')}
          disabled={readOnly}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-700">{t('requests.form.originCountry')}</Label>
        <Select
          value={formData.origin_country}
          onValueChange={(v) => setFormData({ ...formData, origin_country: v })}
          disabled={readOnly}
        >
          <SelectTrigger className="mt-1 border-gray-300">
            <SelectValue placeholder={t("common.selectCountry")} />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="inline-flex items-center gap-1.5"><Flag code={c.code} className="w-4 h-3" /> {c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Destination + Country (with autocomplete) — for customs only this is optional */}
      <div>
        <Label className="text-gray-700">{t('requests.form.destination')} {isCustomsOnly ? '(optional)' : '*'}</Label>
        <LocationAutocomplete
          value={formData.destination}
          onChange={(v) => setFormData({ ...formData, destination: v })}
          onLocationSelect={(loc) => setFormData({ ...formData, destination: loc.location_name, destination_country: loc.country_code })}
          countryCode={formData.destination_country || undefined}
          placeholder={t('requests.destinationPlaceholder')}
          disabled={readOnly}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-700">{t('requests.form.destinationCountry')}</Label>
        <Select
          value={formData.destination_country}
          onValueChange={(v) => setFormData({ ...formData, destination_country: v })}
          disabled={readOnly}
        >
          <SelectTrigger className="mt-1 border-gray-300">
            <SelectValue placeholder={t("common.selectCountry")} />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="inline-flex items-center gap-1.5"><Flag code={c.code} className="w-4 h-3" /> {c.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Container-specific fields ─── */}
      {isContainer && (
        <>
          <div>
            <Label className="text-gray-700">{t('requests.form.containerType')}</Label>
            <Select
              value={formData.container_type}
              onValueChange={(v) => setFormData({ ...formData, container_type: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.containerCount')}</Label>
            <Input
              type="number"
              min={1}
              value={formData.container_count}
              onChange={(e) => setFormData({ ...formData, container_count: parseInt(e.target.value) || 1 })}
              className="mt-1 border-gray-300"
              disabled={readOnly}
            />
          </div>
        </>
      )}

      {/* ─── Truck/Van-specific fields: FTL/LTL + Vehicle Type ─── */}
      {isTruck && (
        <>
          <div className="sm:col-span-2">
            <Label className="text-gray-700">{t('requests.form.transportMode')} *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TRANSPORT_MODES.map((tm) => (
                <button
                  key={tm.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setFormData({ ...formData, transport_mode: tm.value })}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    formData.transport_mode === tm.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span>{tm.emoji}</span>
                  <span>{formatTransportModeShortLabel(tm.value)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.vehicleType')} *</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1 border-gray-300">
                <SelectValue placeholder={t("common.selectVehicleType")} />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((vt) => (
                  <SelectItem key={vt.value} value={vt.value}>
                    {formatVehicleTypeLabel(vt.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.pallets')}</Label>
            <Input
              type="text"
              value={formData.container_type}
              onChange={(e) => setFormData({ ...formData, container_type: e.target.value })}
              className="mt-1 border-gray-300"
              placeholder="e.g. 24 pallets, 80m³"
              disabled={readOnly}
            />
          </div>
        </>
      )}

      {/* ─── Rail-specific fields ─── */}
      {isRail && (
        <>
          <div>
            <Label className="text-gray-700">{t('requests.form.wagonType')}</Label>
            <Select
              value={formData.container_type}
              onValueChange={(v) => setFormData({ ...formData, container_type: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="mt-1 border-gray-300">
                <SelectValue placeholder={t("common.selectWagonType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Container_Wagon">Container Wagon</SelectItem>
                <SelectItem value="Open_Wagon">Open Wagon</SelectItem>
                <SelectItem value="Covered_Wagon">Covered Wagon</SelectItem>
                <SelectItem value="Tank_Wagon">Tank Wagon</SelectItem>
                <SelectItem value="Intermodal">Intermodal Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">{t('requests.form.wagonCount')}</Label>
            <Input
              type="number"
              min={1}
              value={formData.container_count}
              onChange={(e) => setFormData({ ...formData, container_count: parseInt(e.target.value) || 1 })}
              className="mt-1 border-gray-300"
              disabled={readOnly}
            />
          </div>
        </>
      )}

      {/* ─── Oversized-specific fields ─── */}
      {isOversized && (
        <div className="sm:col-span-2">
          <Label className="text-gray-700">{t('requests.form.cargoDimensions')}</Label>
          <Input
            value={formData.special_requirements}
            onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
            className="mt-1 border-gray-300"
            placeholder="e.g. 12m × 3.5m × 4m, 45 tons, requires escort"
            disabled={readOnly}
          />
        </div>
      )}

      {/* ─── Common fields ─── */}
      <div className="sm:col-span-2">
        <Label className="text-gray-700">{t('requests.form.cargoDesc')}</Label>
        <Textarea
          value={formData.cargo_description}
          onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
          className="mt-1 border-gray-300"
          rows={2}
          placeholder={isCustomsOnly ? 'e.g. Electronics, 24 pallets, value EUR 50,000' : 'e.g. Electronics, palletized, 24 pallets'}
          disabled={readOnly}
        />
      </div>
      {!isCustomsOnly && (
        <div>
          <Label className="text-gray-700">{t('requests.form.weight')}</Label>
          <Input
            type="number"
            value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
            className="mt-1 border-gray-300"
            placeholder="e.g. 18000"
            disabled={readOnly}
          />
        </div>
      )}
      <div>
        <Label className="text-gray-700">{t('requests.form.preferredDate')}</Label>
        <Input
          type="date"
          value={formData.preferred_date}
          onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
          className="mt-1 border-gray-300"
          disabled={readOnly}
        />
      </div>
      {!isCustomsOnly && (
        <div>
          <Label className="text-gray-700">{t('requests.form.deadline')}</Label>
          <Input
            type="date"
            value={formData.deadline_date}
            onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
            className="mt-1 border-gray-300"
            disabled={readOnly}
          />
        </div>
      )}
      {!isOversized && (
        <div className="sm:col-span-2">
          <Label className="text-gray-700">{t('requests.form.specialReq')}</Label>
          <Textarea
            value={formData.special_requirements}
            onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
            className="mt-1 border-gray-300"
            rows={2}
            placeholder={isCustomsOnly ? 'e.g. Urgent T1, perishable goods' : 'e.g. ADR goods, temperature controlled'}
            disabled={readOnly}
          />
        </div>
      )}
    </div>
    );
  };

  // Helper to render request detail line
  const getRequestDetailLine = (req: any) => {
    const cat = req.transport_category;
    if (cat === 'truck_van') {
      const mode = req.transport_mode ? formatTransportModeShortLabel(req.transport_mode) : '';
      const vehicle = req.vehicle_type ? formatVehicleTypeLabel(req.vehicle_type) : '';
      const parts = [mode, vehicle].filter(Boolean);
      return parts.length > 0 ? parts.join(' • ') : t('category.truckVan');
    }
    if (cat === 'customs_only') {
      const svc = req.customs_service_type ? (CUSTOMS_SERVICE_MAP[req.customs_service_type] || req.customs_service_type) : '';
      return svc || t('category.customsOnly');
    }
    if (cat === 'container') {
      return `${CONTAINER_SHORT[req.container_type] || req.container_type} × ${req.container_count || 1}`;
    }
    if (cat === 'rail') {
      return `${req.container_type || t('category.rail')} × ${req.container_count || 1}`;
    }
    if (cat === 'oversized') {
      return t('category.oversized');
    }
    // Legacy fallback
    return `${CONTAINER_SHORT[req.container_type] || req.container_type || ''} × ${req.container_count || 1}`;
  };

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t('requests.title')}</h1>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('requests.new')}
            </Button>
          )}
        </div>

        {/* Create Request Form */}
        {showForm && (
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">{t('requests.new')}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFormFields(form, setForm, toggleService)}
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={createMutation.isPending}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {t('requests.form.cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !form.origin.trim() || (!form.destination.trim() && form.transport_category !== 'customs_only') || (form.transport_category === 'customs_only' && !form.customs_service_type)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
                  ) : (
                    t('requests.form.submit')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Requests */}
        {!showForm && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{t('requests.myRequests')}</h2>
            </div>

            {/* Filter Bar — Dropdown-based */}
            {requests.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{t('filter.filters')}</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0">
                      {[filterCategory, filterCountry, filterStatus, filterMode].filter(Boolean).length}
                    </Badge>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {showFilters && (
                  <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Category filter */}
                    <div className="min-w-[140px]">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.category')}</label>
                      <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-9 border-gray-300 bg-white">
                          <SelectValue placeholder={t('filter.allCategories')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('filter.allCategories')}</SelectItem>
                          {TRANSPORT_TYPES.map((tt) => (
                            <SelectItem key={tt.value} value={tt.value}>
                              {tt.emoji} {formatTransportCategoryLabel(tt.value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mode filter */}
                    <div className="min-w-[130px]">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.transportMode')}</label>
                      <Select value={filterMode} onValueChange={(v) => setFilterMode(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-9 border-gray-300 bg-white">
                          <SelectValue placeholder={t('filter.allModes')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('filter.allModes')}</SelectItem>
                          {TRANSPORT_MODES.map((tm) => (
                            <SelectItem key={tm.value} value={tm.value}>
                              {formatTransportModeShortLabel(tm.value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country filter */}
                    <div className="min-w-[140px]">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.country')}</label>
                      <Select value={filterCountry} onValueChange={(v) => setFilterCountry(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-9 border-gray-300 bg-white">
                          <SelectValue placeholder={t('filter.allCountries')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('filter.allCountries')}</SelectItem>
                          {usedCountries.map((code) => (
                            <SelectItem key={code} value={code}>
                              <span className="inline-flex items-center gap-1.5"><Flag code={code} className="w-4 h-3" /> {COUNTRY_MAP[code] || code}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status filter */}
                    <div className="min-w-[130px]">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.status')}</label>
                      <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                        <SelectTrigger className="h-9 border-gray-300 bg-white">
                          <SelectValue placeholder={t('filter.allStatuses')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                          {usedStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear all */}
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFilterCategory(''); setFilterCountry(''); setFilterStatus(''); setFilterMode(''); }}
                        className="text-red-600 hover:bg-red-50 h-9"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        {t('filter.clearAll')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {filteredRequests.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">
                    {hasActiveFilters ? t('requests.noMatchFilters') : t('requests.empty')}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setFilterCategory(''); setFilterCountry(''); setFilterStatus(''); setFilterMode(''); }}
                      className="mt-2 text-blue-600"
                    >
                      {t('filter.clearAll')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredRequests.map((req: any) => {
                  const catInfo = TRANSPORT_TYPE_MAP[req.transport_category];
                  const services = parseServices(req.additional_services);
                  const needsCustoms = services.includes('customs_t1');
                  const modeInfo = req.transport_mode ? TRANSPORT_MODE_MAP[req.transport_mode] : null;
                  return (
                    <Card key={req.id} className="bg-white border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                {req.origin_country && (
                                  <Flag code={req.origin_country} className="w-4 h-3" />
                                )}
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span>{req.origin}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                                {req.destination_country && (
                                  <Flag code={req.destination_country} className="w-4 h-3" />
                                )}
                                <span>{req.destination || '—'}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${getStatusBadge(req.status)}`}
                              >
                                {t(`status.${req.status}`)}
                              </Badge>
                              {catInfo && (
                                <Badge variant="outline" className={`text-xs font-medium ${catInfo.color}`}>
                                  {catInfo.emoji} {formatTransportCategoryLabel(req.transport_category)}
                                </Badge>
                              )}
                              {modeInfo && (
                                <Badge variant="outline" className={`text-xs font-medium ${modeInfo.color}`}>
                                  {formatTransportModeShortLabel(req.transport_mode)}
                                </Badge>
                              )}
                              {services.map((svc) => {
                                const svcInfo = SERVICE_MAP[svc];
                                if (!svcInfo) return null;
                                return (
                                  <Badge key={svc} variant="outline" className={`text-xs font-medium ${svcInfo.color}`}>
                                    {svcInfo.emoji} {formatAdditionalServiceLabel(svc)}
                                  </Badge>
                                );
                              })}
                            </div>

                            {/* Prominent Customs/T1 indicator */}
                            {needsCustoms && (
                              <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md w-fit">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs font-semibold text-amber-700">
                                  {t('shipments.requiredServices')}: {formatAdditionalServiceLabel('customs_t1')}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              <span>{getRequestDetailLine(req)}</span>
                              {req.weight_kg > 0 && <span>• {req.weight_kg} kg</span>}
                              {req.preferred_date && <span>• {t('common.pickup')}: {req.preferred_date}</span>}
                              {req.vehicle_type && req.transport_category === 'truck_van' && (
                                <span>• {formatVehicleTypeLabel(req.vehicle_type)}</span>
                              )}
                            </div>
                            {req.cargo_description && (
                              <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{req.cargo_description}</p>
                            )}
                            {req.tracking_link && (
                              <a
                                href={req.tracking_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {t('shipments.trackShipment')}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Edit button — available for editable statuses */}
                            {canEdit(req.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(req)}
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                {t('common.edit')}
                              </Button>
                            )}
                            {/* View-only details for locked statuses */}
                            {isLocked(req.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(req)}
                                className="border-gray-200 text-gray-500 hover:bg-gray-50"
                              >
                                {t('common.viewDetails')}
                              </Button>
                            )}
                            {(req.status === 'published' || req.status === 'offers_received' || req.status === 'in_progress') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/offers?request_id=${req.id}`)}
                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                {t('requests.viewOffers')}
                              </Button>
                            )}
                            {req.status !== 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setThreadsRequest(req)}
                                className="border-gray-200 text-gray-600 hover:bg-gray-50"
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                {t('chat.threads')}
                              </Button>
                            )}
                            {(req.status === 'published' || req.status === 'draft') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(req.id)}
                                disabled={deleteMutation.isPending}
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Edit Request Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isLocked(editRequestStatus) ? (
                  <>{t('common.viewDetails')}</>
                ) : (
                  <>
                    <Pencil className="w-4 h-4 text-blue-600" />
                    {t('common.edit')}
                  </>
                )}
                {isLocked(editRequestStatus) && (
                  <Badge variant="outline" className="ml-2 text-xs bg-gray-100 text-gray-500">
                    {t('common.readOnly')}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {renderFormFields(editForm, setEditForm, toggleEditService, isLocked(editRequestStatus))}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {isLocked(editRequestStatus) ? t('common.close') : t('common.cancel')}
              </Button>
              {!isLocked(editRequestStatus) && (
                <Button
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending || !editForm.origin.trim() || (!editForm.destination.trim() && editForm.transport_category !== 'customs_only') || (editForm.transport_category === 'customs_only' && !editForm.customs_service_type)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
                  ) : (
                    t('common.saveChanges')
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Carrier inquiry threads for one of my requests */}
        <Dialog open={!!threadsRequest} onOpenChange={(o) => { if (!o) setThreadsRequest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('chat.threads')}</DialogTitle>
            </DialogHeader>
            {threadsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('chat.noThreads')}</p>
            ) : (
              <div className="space-y-1.5">
                {threads.map((th: any) => (
                  <button
                    key={th.carrier_user_id}
                    onClick={() => {
                      setChatThread({
                        requestId: threadsRequest.id,
                        carrierUserId: th.carrier_user_id,
                        carrierName: th.carrier_name,
                      });
                      setThreadsRequest(null);
                    }}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{th.carrier_name || th.carrier_user_id}</p>
                      <p className="text-xs text-gray-500 truncate">{th.last_message}</p>
                    </div>
                    {th.unread_count > 0 && (
                      <Badge className="bg-brand text-white shrink-0">{th.unread_count}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ChatPanel
          open={!!chatThread}
          onOpenChange={(o) => { if (!o) setChatThread(null); }}
          requestId={chatThread?.requestId || null}
          carrierUserId={chatThread?.carrierUserId || null}
          currentUserId={String(user?.data?.id || '')}
          counterpartName={chatThread?.carrierName}
        />
      </div>
    </Layout>
  );
}