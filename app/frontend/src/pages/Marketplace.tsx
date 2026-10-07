import { useState, useMemo } from 'react';
import { t, formatTransportModeLabel, formatRequestLabel, formatTransportCategoryLabel, formatAdditionalServiceLabel, formatOfferStatusLabel, formatVehicleTypeLabel, formatTransportModeShortLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceRequests, useSubmitOffer, useMyCompany } from '@/hooks/useAppQueries';
import { hasCompanyRole, isOnlyForwarder, parseCompanyRoles } from '@/lib/formatCompanyRoles';
import Layout from '@/components/Layout';
import Flag from '@/components/Flag';
import ChatPanel from '@/components/ChatPanel';
import { Card, CardContent } from '@/components/ui/card';
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
import { MapPin, ArrowRight, Package, Send, Building2, Calendar, Loader2, X, ShieldCheck, SlidersHorizontal, ChevronDown, MessageCircle } from 'lucide-react';
import {
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_MAP,
  TRANSPORT_MODE_MAP,
  VEHICLE_TYPE_MAP,
  CUSTOMS_SERVICE_MAP,
  SERVICE_MAP,
  parseServices,
  COUNTRY_MAP,
  CONTAINER_SHORT,
  TRANSPORT_MODES,
} from '@/lib/constants';

type ServiceType = 'transport' | 'customs_t1';

export default function Marketplace() {
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestIdParam, setRequestIdParam] = useState<number>(0);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [chatRequest, setChatRequest] = useState<any>(null);
  const [offerServiceType, setOfferServiceType] = useState<ServiceType>('transport');
  const [offerForm, setOfferForm] = useState({
    price: 0,
    currency: 'EUR',
    estimated_days: 0,
    transport_mode: 'road',
    notes: '',
  });

  // Filters — dropdown-based
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOriginCountry, setFilterOriginCountry] = useState('');
  const [filterDestCountry, setFilterDestCountry] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const currentUserId = user?.data?.id || '';

  // Load company data for role-based button visibility
  const { data: companyData } = useMyCompany(!loading && !!profile);
  const companyRoles = parseCompanyRoles(companyData?.company_roles);

  // Role checks based on approved company roles (not legacy profile.role)
  const isTerminal = hasCompanyRole(companyData?.company_roles, 'terminal_depot');
  const isCarrier = hasCompanyRole(companyData?.company_roles, 'carrier');
  const isContainerOp = hasCompanyRole(companyData?.company_roles, 'container_operator');
  const isRailOp = hasCompanyRole(companyData?.company_roles, 'intermodal_rail');
  const isCustomsAgent = hasCompanyRole(companyData?.company_roles, 'customs_agent');
  const isForwarder = hasCompanyRole(companyData?.company_roles, 'freight_forwarder');
  const isForwarderOnly = isOnlyForwarder(companyData?.company_roles);

  // Can submit transport offers: carrier, container operator, or rail operator
  const canSubmitTransport = isCarrier || isContainerOp || isRailOp;
  // Can submit customs/T1 offers: customs agent, terminal, OR freight forwarder
  const canSubmitCustoms = isCustomsAgent || isTerminal || isForwarder;

  // React Query hooks — enabled for all roles now
  const { data: requests = [], isLoading: dataLoading, isFetching } = useMarketplaceRequests(!!profile);
  const submitOfferMutation = useSubmitOffer();

  // For forwarders: filter out their OWN requests (they manage those on /requests page)
  const visibleRequests = useMemo(() => {
    if (isForwarder && currentUserId) {
      return requests.filter((r: any) => String(r.user_id) !== String(currentUserId));
    }
    return requests;
  }, [requests, isForwarder, currentUserId, companyRoles]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    let result = visibleRequests;
    if (filterCategory) {
      result = result.filter((r: any) => r.transport_category === filterCategory);
    }
    if (filterOriginCountry) {
      result = result.filter((r: any) => r.origin_country === filterOriginCountry);
    }
    if (filterDestCountry) {
      result = result.filter((r: any) => r.destination_country === filterDestCountry);
    }
    if (filterMode) {
      result = result.filter((r: any) => r.transport_mode === filterMode);
    }
    return result;
  }, [visibleRequests, filterCategory, filterOriginCountry, filterDestCountry, filterMode]);

  // Unique origin and destination countries from visible data
  const usedOriginCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const r of visibleRequests as any[]) {
      if (r.origin_country) codes.add(r.origin_country);
    }
    return Array.from(codes).sort();
  }, [visibleRequests]);

  const usedDestCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const r of visibleRequests as any[]) {
      if (r.destination_country) codes.add(r.destination_country);
    }
    return Array.from(codes).sort();
  }, [visibleRequests]);

  const hasActiveFilters = filterCategory || filterOriginCountry || filterDestCountry || filterMode;

  // Mode filter should only show for Truck/Van category
  const showModeFilter = !filterCategory || filterCategory === 'truck_van';

  const openOfferDialog = (req: any, serviceType: ServiceType) => {
    setSelectedRequest(req);
    setRequestIdParam(Number(req.id));
    setOfferServiceType(serviceType);
    setOfferDialogOpen(true);
  };

  const handleSubmitOffer = () => {
    if (!requestIdParam || !offerForm.price) {
      return;
    }
    submitOfferMutation.mutate(
      {
        request_id: requestIdParam,
        price: offerForm.price,
        currency: offerForm.currency,
        estimated_days: offerForm.estimated_days || 0,
        transport_mode: offerForm.transport_mode,
        notes: offerForm.notes || '',
        carrier_name: profile?.company_name || profile?.display_name || '',
        service_type: offerServiceType,
      },
      {
        onSuccess: () => {
          setOfferDialogOpen(false);
          setRequestIdParam(0);
          setOfferForm({
            price: 0, currency: 'EUR', estimated_days: 0,
            transport_mode: 'road', notes: '',
          });
        },
      }
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
    return `${CONTAINER_SHORT[req.container_type] || req.container_type || ''} × ${req.container_count || 1}`;
  };

  if (loading || (dataLoading && requests.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  /** Determine subtitle text based on role */
  const getSubtitle = () => {
    if (isTerminal) return t('marketplace.terminalSubtitle');
    if (isForwarder) return t('marketplace.forwarderSubtitle');
    return t('marketplace.subtitle');
  };

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {isTerminal ? t('nav.allRequests') : isForwarder ? t('nav.marketplace') : t('marketplace.title')}
            </h1>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          <p className="text-gray-500 mt-1">{getSubtitle()}</p>
        </div>

        {/* Filter Bar — Dropdown-based */}
        {visibleRequests.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{t('filter.filters')}</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0">
                  {[filterCategory, filterOriginCountry, filterDestCountry, filterMode].filter(Boolean).length}
                </Badge>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Category filter */}
                <div className="min-w-[140px]">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.category')}</label>
                  <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === 'all' ? '' : v); if (v !== 'truck_van') setFilterMode(''); }}>
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

                {/* Mode filter — only for Truck/Van */}
                {showModeFilter && (
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
                            {formatTransportModeLabel(tm.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Origin Country filter */}
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.originCountry')}</label>
                  <Select value={filterOriginCountry} onValueChange={(v) => setFilterOriginCountry(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 border-gray-300 bg-white">
                      <SelectValue placeholder={t('filter.allCountries')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filter.allCountries')}</SelectItem>
                      {usedOriginCountries.map((code) => (
                        <SelectItem key={code} value={code}>
                          <span className="inline-flex items-center gap-1.5"><Flag code={code} className="w-4 h-3" /> {COUNTRY_MAP[code] || code}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Country filter */}
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('filter.destCountry')}</label>
                  <Select value={filterDestCountry} onValueChange={(v) => setFilterDestCountry(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 border-gray-300 bg-white">
                      <SelectValue placeholder={t('filter.allCountries')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('filter.allCountries')}</SelectItem>
                      {usedDestCountries.map((code) => (
                        <SelectItem key={code} value={code}>
                          <span className="inline-flex items-center gap-1.5"><Flag code={code} className="w-4 h-3" /> {COUNTRY_MAP[code] || code}</span>
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
                    onClick={() => { setFilterCategory(''); setFilterOriginCountry(''); setFilterDestCountry(''); setFilterMode(''); }}
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
                {hasActiveFilters
                  ? t('marketplace.noMatchFilters')
                  : isForwarder
                    ? t('marketplace.forwarderEmpty')
                    : t('marketplace.empty')}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterCategory(''); setFilterOriginCountry(''); setFilterDestCountry(''); setFilterMode(''); }}
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
              const needsCustoms = services.includes('customs_t1') || req.transport_category === 'customs_only';
              const isOwner = String(req.user_id) === String(currentUserId);
              const modeInfo = req.transport_mode ? TRANSPORT_MODE_MAP[req.transport_mode] : null;

              return (
                <Card key={req.id} className="bg-white border-gray-200 hover:border-blue-200 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
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
                          {services.map((svc: string) => {
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
                        {needsCustoms && req.transport_category !== 'customs_only' && (
                          <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-md w-fit">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700">
                              {t('shipments.needsCustoms')}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>{getRequestDetailLine(req)}</span>
                          {req.weight_kg > 0 && <span>• {req.weight_kg} kg</span>}
                          {req.user_company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span className="text-gray-600">{t('common.by')}</span> {req.user_company}
                            </span>
                          )}
                          {req.preferred_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {t('common.pickup')}: {req.preferred_date}
                            </span>
                          )}
                        </div>
                        {req.cargo_description && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{req.cargo_description}</p>
                        )}
                      </div>

                      {/* Action buttons — based on approved company roles */}
                      {!isOwner && (canSubmitTransport || canSubmitCustoms) && (
                        <div className="flex flex-col gap-2 shrink-0">
                          {/* Transport offer: carrier, container operator, rail operator */}
                          {canSubmitTransport && req.transport_category !== 'customs_only' && (
                            <Button
                              size="sm"
                              onClick={() => openOfferDialog(req, 'transport')}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Send className="w-4 h-4 mr-1.5" />
                              {t('offers.submitTransportOffer')}
                            </Button>
                          )}
                          {/* Customs/T1 offer: customs agent, terminal, freight forwarder */}
                          {canSubmitCustoms && needsCustoms && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOfferDialog(req, 'customs_t1')}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <ShieldCheck className="w-4 h-4 mr-1.5" />
                              {t('offers.submitCustomsOffer')}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setChatRequest(req)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50"
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            {t('chat.askQuestion')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit Offer Dialog */}
        <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {offerServiceType === 'customs_t1' ? (
                  <>
                    <ShieldCheck className="w-5 h-5 text-amber-600" />
                    {t('offers.submitCustomsOffer')}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-blue-600" />
                    {t('offers.submitTransportOffer')}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Service type badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={
                  offerServiceType === 'customs_t1'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }
              >
                {offerServiceType === 'customs_t1' ? '🛃' : '🚛'}{' '}
                {t(`offers.serviceType.${offerServiceType}`)}
              </Badge>
            </div>

            {selectedRequest && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-1.5">
                  {selectedRequest.origin_country && <Flag code={selectedRequest.origin_country} className="w-4 h-3" />}
                  {selectedRequest.origin} →
                  {selectedRequest.destination_country && <Flag code={selectedRequest.destination_country} className="w-4 h-3" />}
                  {selectedRequest.destination || '—'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">
                    {getRequestDetailLine(selectedRequest)}
                  </p>
                  {TRANSPORT_TYPE_MAP[selectedRequest.transport_category] && (
                    <Badge variant="outline" className={`text-[10px] ${TRANSPORT_TYPE_MAP[selectedRequest.transport_category].color}`}>
                      {TRANSPORT_TYPE_MAP[selectedRequest.transport_category].emoji} {formatTransportCategoryLabel(selectedRequest.transport_category)}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('marketplace.form.price')} *</Label>
                <Input
                  type="number"
                  value={offerForm.price || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, price: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  placeholder="e.g. 1200"
                />
              </div>
              <div>
                <Label>{t('marketplace.form.currency')}</Label>
                <Select
                  value={offerForm.currency}
                  onValueChange={(v) => setOfferForm({ ...offerForm, currency: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RSD">RSD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {offerServiceType === 'transport' && (
                <>
                  <div>
                    <Label>{t('marketplace.form.estimatedDays')}</Label>
                    <Input
                      type="number"
                      value={offerForm.estimated_days || ''}
                      onChange={(e) => setOfferForm({ ...offerForm, estimated_days: parseInt(e.target.value) || 0 })}
                      className="mt-1"
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <Label>{t('marketplace.form.transportMode')}</Label>
                    <Select
                      value={offerForm.transport_mode}
                      onValueChange={(v) => setOfferForm({ ...offerForm, transport_mode: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="road">{formatTransportModeLabel('road')}</SelectItem>
                        <SelectItem value="rail">{formatTransportModeLabel('rail')}</SelectItem>
                        <SelectItem value="sea">{formatTransportModeLabel('sea')}</SelectItem>
                        <SelectItem value="intermodal">{formatTransportModeLabel('intermodal')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Label>{t('marketplace.form.notes')}</Label>
                <Textarea
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  className="mt-1"
                  rows={3}
                  placeholder={
                    offerServiceType === 'customs_t1'
                      ? t('marketplace.customsPlaceholder')
                      : t('marketplace.offerPlaceholder')
                  }
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                <Button variant="outline" onClick={() => setOfferDialogOpen(false)} disabled={submitOfferMutation.isPending}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSubmitOffer}
                  disabled={submitOfferMutation.isPending || !offerForm.price}
                  className={
                    offerServiceType === 'customs_t1'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                >
                  {submitOfferMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.loading')}</>
                  ) : (
                    t('marketplace.form.submit')
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ChatPanel
          open={!!chatRequest}
          onOpenChange={(o) => { if (!o) setChatRequest(null); }}
          requestId={chatRequest?.id || null}
          currentUserId={currentUserId}
          counterpartName={chatRequest?.user_company || undefined}
        />
      </div>
    </Layout>
  );
}