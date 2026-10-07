import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { t, formatTransportModeLabel, formatRequestLabel, formatTransportCategoryLabel, formatAdditionalServiceLabel, formatOfferStatusLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useOffersForRequest,
  useRequestInfo,
  useMyOffers,
  useAcceptOffer,
  useRejectOffer,
  useReceivedOffers,
  useMyCompany,
} from '@/hooks/useAppQueries';
import { hasCompanyRole, isOnlyForwarder } from '@/lib/formatCompanyRoles';
import Layout from '@/components/Layout';
import ChatPanel from '@/components/ChatPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Building2,
  MessageSquare,
  MapPin,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import { parseServices, SERVICE_MAP } from '@/lib/constants';



export default function Offers() {
  const navigate = useNavigate();
  useLanguage(); // Subscribe to language changes for re-render
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get('request_id');
  const tabParam = searchParams.get('tab');
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();

  // Tab state: 'received' or 'submitted'
  const [activeTab, setActiveTab] = useState<'received' | 'submitted'>(
    tabParam === 'submitted' ? 'submitted' : 'received'
  );

  // Chat modal state — which offer's negotiation thread is open, if any
  const [chatOffer, setChatOffer] = useState<{ id: number; counterpartName?: string } | null>(null);
  const openChat = (offerId: number, counterpartName?: string) =>
    setChatOffer({ id: offerId, counterpartName });

  // Load company data for role-based visibility
  const { data: companyData } = useMyCompany(!loading && !!profile);

  // Role checks based on approved company roles
  const isForwarder = hasCompanyRole(companyData?.company_roles, 'freight_forwarder');
  const isCarrier = hasCompanyRole(companyData?.company_roles, 'carrier');
  const isRailOp = hasCompanyRole(companyData?.company_roles, 'intermodal_rail');
  const isContainerOp = hasCompanyRole(companyData?.company_roles, 'container_operator');
  const isTerminal = hasCompanyRole(companyData?.company_roles, 'terminal_depot');
  const isCustomsAgent = hasCompanyRole(companyData?.company_roles, 'customs_agent');

  // A "provider" is any role that can submit offers
  const isProvider = isCarrier || isRailOp || isContainerOp || isTerminal || isCustomsAgent || isForwarder;

  // Determine view mode:
  // - If request_id is present AND user is forwarder, show "received offers for specific request" view
  // - Otherwise show tab-based view (received / submitted)
  const showForwarderView = (isForwarder || isAdmin) && !!requestIdParam;

  // React Query hooks
  const {
    data: forwarderOffers = [],
    isLoading: forwarderOffersLoading,
    isFetching: forwarderOffersFetching,
  } = useOffersForRequest(requestIdParam, !!profile && showForwarderView);

  const {
    data: requestInfo,
  } = useRequestInfo(requestIdParam, !!profile && showForwarderView && !!requestIdParam);

  // Received offers (all pending offers on user's RFQs) — for tab view
  const {
    data: allReceivedOffers = [],
    isLoading: receivedLoading,
  } = useReceivedOffers(!!profile && (isForwarder || isAdmin) && !showForwarderView);

  const {
    data: carrierOffers = [],
    isLoading: carrierOffersLoading,
    isFetching: carrierOffersFetching,
  } = useMyOffers(!!profile && (isProvider || isAdmin) && !showForwarderView && activeTab === 'submitted');

  const acceptMutation = useAcceptOffer();
  const rejectMutation = useRejectOffer();

  const offers = showForwarderView ? forwarderOffers : carrierOffers;
  const dataLoading = showForwarderView ? forwarderOffersLoading : (activeTab === 'received' ? receivedLoading : carrierOffersLoading);
  const isFetching = showForwarderView ? forwarderOffersFetching : carrierOffersFetching;

  // Split offers by service_type for forwarder view
  const { transportOffers, customsOffers } = useMemo(() => {
    const transport: any[] = [];
    const customs: any[] = [];
    for (const o of offers) {
      if ((o.service_type || 'transport') === 'customs_t1') {
        customs.push(o);
      } else {
        transport.push(o);
      }
    }
    return { transportOffers: transport, customsOffers: customs };
  }, [offers]);

  // Check if request needs customs
  const requestNeedsCustoms = useMemo(() => {
    if (!requestInfo) return false;
    return parseServices(requestInfo.additional_services).includes('customs_t1') ||
      requestInfo.transport_category === 'customs_only';
  }, [requestInfo]);

  // Check if request needs transport
  const requestNeedsTransport = useMemo(() => {
    if (!requestInfo) return true;
    return requestInfo.transport_category !== 'customs_only';
  }, [requestInfo]);

  // Check acceptance status per service type
  const hasAcceptedTransport = transportOffers.some((o: any) => o.status === 'accepted');
  const hasAcceptedCustoms = customsOffers.some((o: any) => o.status === 'accepted');

  const handleAcceptOffer = (offerId: number, requestId?: number) => {
    const reqId = requestId || (requestIdParam ? parseInt(requestIdParam) : null);
    if (!reqId) return;
    acceptMutation.mutate(
      { offer_id: offerId, request_id: reqId },
      {
        onSuccess: () => {
          // Stay on page to let user see the result
        },
      }
    );
  };

  const handleRejectOffer = (offerId: number, requestId?: number) => {
    const reqId = requestId || (requestIdParam ? parseInt(requestIdParam) : null);
    if (!reqId) return;
    rejectMutation.mutate(
      { offer_id: offerId, request_id: reqId },
      {
        onSuccess: () => {
          // Stay on page
        },
      }
    );
  };

  const getOfferStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
      expired: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getStatusLabel = (status: string) => {
    return t(`status.${status}`);
  };

  if (loading || (dataLoading && offers.length === 0 && allReceivedOffers.length === 0)) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const renderOfferCard = (offer: any, sectionServiceType: 'transport' | 'customs_t1', showActions: boolean = true) => {
    const isCustomsOffer = sectionServiceType === 'customs_t1';
    const hasAcceptedInSection = isCustomsOffer ? hasAcceptedCustoms : hasAcceptedTransport;
    const canAccept = showActions && showForwarderView && requestIdParam && offer.status === 'pending' && !hasAcceptedInSection;
    const canReject = showActions && showForwarderView && requestIdParam && offer.status === 'pending';

    return (
      <Card key={offer.id} className="bg-white border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Company Name & Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {isCustomsOffer ? (
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Building2 className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">
                    {offer.carrier_name || (isCustomsOffer ? t('common.anonymousAgent') : t('common.anonymousCarrier'))}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${getOfferStatusBadge(offer.status)}`}
                >
                  {getStatusLabel(offer.status)}
                </Badge>
                {/* Service type badge for provider view */}
                {!showForwarderView && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      isCustomsOffer
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {isCustomsOffer ? '🛃' : '🚛'} {t(`offers.serviceType.${offer.service_type || 'transport'}`)}
                  </Badge>
                )}
              </div>

              {/* Price, Transit Time, Mode */}
              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  {offer.price} {offer.currency || 'EUR'}
                </span>
                {offer.estimated_days > 0 && (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {offer.estimated_days} {t('common.days')}
                  </span>
                )}
                {offer.transport_mode && !isCustomsOffer && (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Truck className="w-4 h-4 text-gray-400" />
                    {formatTransportModeLabel(offer.transport_mode)}
                  </span>
                )}
              </div>

              {/* Request route info for provider/carrier view */}
              {!showForwarderView && offer.request_id && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatRequestLabel(offer.request_id)}</span>
                </div>
              )}

              {/* Message */}
              {offer.notes && (
                <div className="flex items-start gap-1.5 text-xs text-gray-500">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{offer.notes}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openChat(offer.id, offer.carrier_name)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                {t('chat.button')}
              </Button>
              {canAccept && (
                <Button
                  size="sm"
                  onClick={() => handleAcceptOffer(offer.id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className={
                    isCustomsOffer
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                  )}
                  {t('offers.accept')}
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectOffer(offer.id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1.5" />
                  )}
                  {t('offers.reject')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render received offers card for tab view (with accept/reject actions)
  const renderReceivedOfferCard = (offer: any) => {
    const isCustomsOffer = (offer.service_type || 'transport') === 'customs_t1';
    const canAccept = offer.status === 'pending';
    const canReject = offer.status === 'pending';

    return (
      <Card key={offer.id} className="bg-white border-gray-200">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {isCustomsOffer ? (
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Building2 className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-semibold text-gray-900">
                    {offer.carrier_name || (isCustomsOffer ? t('common.anonymousAgent') : t('common.anonymousCarrier'))}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs font-medium ${getOfferStatusBadge(offer.status)}`}
                >
                  {getStatusLabel(offer.status)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    isCustomsOffer
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {isCustomsOffer ? '🛃' : '🚛'} {t(`offers.serviceType.${offer.service_type || 'transport'}`)}
                </Badge>
              </div>

              <div className="flex items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  {offer.price} {offer.currency || 'EUR'}
                </span>
                {offer.estimated_days > 0 && (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {offer.estimated_days} {t('common.days')}
                  </span>
                )}
                {offer.transport_mode && !isCustomsOffer && (
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <Truck className="w-4 h-4 text-gray-400" />
                    {formatTransportModeLabel(offer.transport_mode)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatRequestLabel(offer.request_id)}</span>
                <Button
                  size="sm"
                  variant="link"
                  onClick={() => navigate(`/offers?request_id=${offer.request_id}`)}
                  className="text-blue-600 hover:text-blue-700 text-xs h-auto p-0 ml-2"
                >
                  {t('requests.viewOffers')}
                </Button>
              </div>

              {offer.notes && (
                <div className="flex items-start gap-1.5 text-xs text-gray-500">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{offer.notes}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openChat(offer.id, offer.carrier_name)}
                className="relative border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-4 h-4 mr-1.5" />
                {t('chat.button')}
              </Button>
              {canAccept && (
                <Button
                  size="sm"
                  onClick={() => handleAcceptOffer(offer.id, offer.request_id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className={
                    isCustomsOffer
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                  )}
                  {t('offers.accept')}
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRejectOffer(offer.id, offer.request_id)}
                  disabled={acceptMutation.isPending || rejectMutation.isPending}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1.5" />
                  )}
                  {t('offers.reject')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Forwarder view with sections (when viewing specific request)
  const renderForwarderSections = () => {
    if (!requestIdParam) {
      return (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{t('offers.selectRequest')}</p>
            <Button
              onClick={() => navigate('/requests')}
              className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
            >
              {t('offers.goToRequests')}
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (offers.length === 0) {
      return (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{t('offers.empty')}</p>
            <p className="text-xs text-gray-400 mt-2">
              {t('offers.noTransportOffers')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Coverage Status Banner */}
        {requestNeedsTransport && requestNeedsCustoms && (
          <Card className={`border ${hasAcceptedTransport && hasAcceptedCustoms ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
            <CardContent className="py-3 px-4">
              <p className={`text-xs font-medium ${hasAcceptedTransport && hasAcceptedCustoms ? 'text-emerald-700' : 'text-blue-700'}`}>
                {hasAcceptedTransport && hasAcceptedCustoms
                  ? `✅ ${t('offers.fullyCovered')}`
                  : `ℹ️ ${t('offers.partiallyCovered')}`}
              </p>
              <div className="flex gap-4 mt-1 text-xs">
                <span className={hasAcceptedTransport ? 'text-emerald-600' : 'text-gray-500'}>
                  {hasAcceptedTransport ? '✓' : '○'} {t('offers.transportOffers')}
                </span>
                <span className={hasAcceptedCustoms ? 'text-emerald-600' : 'text-gray-500'}>
                  {hasAcceptedCustoms ? '✓' : '○'} {t('offers.customsOffers')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transport Offers Section */}
        {requestNeedsTransport && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-700">
                {t('offers.transportOffers')} ({transportOffers.length})
              </h2>
            </div>
            {hasAcceptedTransport && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('offers.transportAccepted')}
              </Badge>
            )}
          </div>
          {transportOffers.length === 0 ? (
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="py-6 text-center">
                <p className="text-xs text-gray-400">{t('offers.noTransportOffers')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {transportOffers.map((offer: any) => renderOfferCard(offer, 'transport'))}
            </div>
          )}
        </div>
        )}

        {/* Customs/T1 Offers Section */}
        {requestNeedsCustoms && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  {t('offers.customsOffers')} ({customsOffers.length})
                </h2>
              </div>
              {hasAcceptedCustoms && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('offers.customsAccepted')}
                </Badge>
              )}
            </div>
            {customsOffers.length === 0 ? (
              <Card className="bg-amber-50/50 border-amber-200">
                <CardContent className="py-6 text-center">
                  <p className="text-xs text-amber-600">{t('offers.noCustomsOffers')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {customsOffers.map((offer: any) => renderOfferCard(offer, 'customs_t1'))}
              </div>
            )}
          </div>
        )}

        {/* Navigation to shipments if transport accepted */}
        {hasAcceptedTransport && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => navigate('/shipments')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t('dashboard.viewShipments')} →
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Provider/Carrier view (flat list with service_type badges)
  const renderProviderView = () => {
    if (carrierOffers.length === 0) {
      return (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{t('offers.noSubmittedOffers')}</p>
            <p className="text-xs text-gray-400 mt-2">
              {t('offers.goToMarketplace')}
            </p>
            <Button
              onClick={() => navigate('/marketplace')}
              className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
            >
              {t('dashboard.viewMarketplace')}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-3">
        {carrierOffers.map((offer: any) =>
          renderOfferCard(offer, (offer.service_type || 'transport') as 'transport' | 'customs_t1', false)
        )}
      </div>
    );
  };

  // Received offers tab view
  const renderReceivedTab = () => {
    const pendingOffers = allReceivedOffers.filter((o: any) => o.status === 'pending');
    const historyOffers = allReceivedOffers.filter((o: any) => o.status !== 'pending');

    if (allReceivedOffers.length === 0) {
      return (
        <Card className="bg-white border-gray-200">
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">{t('offers.noReceivedOffers')}</p>
            <p className="text-xs text-gray-400 mt-2">
              {t('offers.noReceivedOffersHint')}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Pending offers */}
        {pendingOffers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              {t('status.pending')} ({pendingOffers.length})
            </h2>
            <div className="grid gap-3">
              {pendingOffers.map((offer: any) => renderReceivedOfferCard(offer))}
            </div>
          </div>
        )}

        {/* History (accepted/rejected) */}
        {historyOffers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              {t('offers.history')} ({historyOffers.length})
            </h2>
            <div className="grid gap-3">
              {historyOffers.map((offer: any) => renderReceivedOfferCard(offer))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tab-based view for forwarder without request_id
  const renderTabView = () => {
    return (
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Inbox className="w-4 h-4 inline mr-1.5" />
            {t('offers.receivedOffers')}
            {allReceivedOffers.filter((o: any) => o.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200 text-xs">
                {allReceivedOffers.filter((o: any) => o.status === 'pending').length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'submitted'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Send className="w-4 h-4 inline mr-1.5" />
            {t('offers.myOffers')}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'received' ? renderReceivedTab() : renderProviderView()}
      </div>
    );
  };

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {showForwarderView ? t('offers.receivedOffers') : t('offers.title')}
            </h1>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          {showForwarderView && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/offers')}
              className="text-gray-600"
            >
              ← {t('offers.allOffers')}
            </Button>
          )}
        </div>

        {/* Show request context for forwarder */}
        {showForwarderView && requestIdParam && requestInfo && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">{formatRequestLabel(requestInfo.id)}</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{requestInfo.origin}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                <span>{requestInfo.destination}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                  {requestInfo.container_type} × {requestInfo.container_count || 1}
                  {requestInfo.preferred_date && ` • ${t('common.pickup')}: ${requestInfo.preferred_date}`}
                </p>
                {parseServices(requestInfo.additional_services).map((svc: string) => {
                  const svcInfo = SERVICE_MAP[svc];
                  if (!svcInfo) return null;
                  return (
                    <Badge key={svc} variant="outline" className={`text-[10px] ${svcInfo.color}`}>
                      {svcInfo.emoji} {formatAdditionalServiceLabel(svc)}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {showForwarderView ? renderForwarderSections() : renderTabView()}
      </div>

      <ChatPanel
        open={!!chatOffer}
        onOpenChange={(o) => { if (!o) setChatOffer(null); }}
        offerId={chatOffer?.id ?? null}
        currentUserId={String(user?.data?.id || '')}
        counterpartName={chatOffer?.counterpartName}
      />
    </Layout>
  );
}