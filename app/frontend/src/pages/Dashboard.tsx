import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useReceivedOffers } from '@/hooks/useAppQueries';
import Layout from '@/components/Layout';
import Flag from '@/components/Flag';
import { Button } from '@/components/ui/button';
import { StatCardSkeleton, CardSkeleton } from '@/components/Skeleton';
import {
  FileText,
  Send,
  Truck,
  CheckCircle,
  Plus,
  Package,
  Inbox,
  Container,
} from 'lucide-react';

const CONTAINER_LABELS: Record<string, string> = {
  '20DV': "20' Dry Van",
  '40DV': "40' Dry Van",
  '40HC': "40' High Cube",
  '45HC': "45' High Cube",
  '20OT': "20' Open Top",
  '40OT': "40' Open Top",
  '20FR': "20' Flat Rack",
  '40FR': "40' Flat Rack",
  'Reefer': 'Reefer',
  '20ft': "20' Standard",
  '40ft': "40' Standard",
  '40ft HC': "40' High Cube",
  '45ft': "45' High Cube",
};

interface DashboardStats {
  requests: number;
  offers: number;
  shipments: number;
  completed: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();

  const role = profile?.role || 'forwarder';
  const isForwarder = role === 'forwarder';
  const isCarrier = role === 'trucking' || role === 'rail';

  // Fetch requests (forwarder: own requests, carrier/terminal: marketplace)
  const { data: myRequests = [], isLoading: reqLoading } = useQuery({
    queryKey: isForwarder ? queryKeys.myRequests : queryKeys.marketplaceRequests,
    queryFn: async () => {
      if (isForwarder) {
        const res = await client.entities.transport_requests.query({
          query: {},
          sort: '-id',
          limit: 10,
        });
        return res?.data?.items || [];
      }
      // Carrier/terminal: marketplace
      try {
        const res = await client.apiCall.invoke({
          url: '/api/v1/marketplace/requests?skip=0&limit=10',
          method: 'GET',
        });
        return res?.data?.items || [];
      } catch {
        return [];
      }
    },
    enabled: !!profile,
    staleTime: 30_000,
  });

  // Fetch shipments (shared endpoint for both roles)
  const { data: myShipments = [], isLoading: shipLoading } = useQuery({
    queryKey: queryKeys.myShipments,
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/marketplace/my-shipments?skip=0&limit=50',
        method: 'GET',
      });
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (data?.items) return data.items;
      return [];
    },
    enabled: !!profile,
    staleTime: 20_000,
  });

  // Fetch carrier offers count (only for carriers)
  const { data: carrierOffers = [] } = useQuery({
    queryKey: queryKeys.myOffers,
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/marketplace/my-offers?skip=0&limit=50',
        method: 'GET',
      });
      return Array.isArray(res?.data) ? res.data : [];
    },
    enabled: !!profile && isCarrier,
    staleTime: 30_000,
  });

  // Fetch received offers for forwarder (pending only for count)
  const { data: receivedOffers = [] } = useReceivedOffers(!!profile && isForwarder);

  // Count only pending received offers
  const pendingReceivedCount = useMemo(() => {
    return receivedOffers.filter((o: any) => o.status === 'pending').length;
  }, [receivedOffers]);

  // Map request_id -> carrier_name, from the shipment created once an offer is accepted
  const carrierByRequestId = useMemo(() => {
    const map: Record<number, string> = {};
    myShipments.forEach((s: any) => {
      if (s.request_id && s.carrier_name) map[s.request_id] = s.carrier_name;
    });
    return map;
  }, [myShipments]);

  // Compute stats from cached data
  const stats: DashboardStats = useMemo(() => {
    // In Progress: shipments that are NOT delivered/completed
    const inProgress = myShipments.filter(
      (s: any) => s.status !== 'delivered' && s.status !== 'completed' && s.status !== 'cancelled'
    ).length;
    // Delivered/Completed
    const completed = myShipments.filter(
      (s: any) => s.status === 'delivered' || s.status === 'completed'
    ).length;

    if (isForwarder) {
      // Open requests: published or offers_received (not yet fully in_progress/delivered)
      const openRequests = myRequests.filter(
        (r: any) => r.status === 'published' || r.status === 'open' || r.status === 'offers_received'
      ).length;
      return {
        requests: openRequests,
        offers: pendingReceivedCount,
        shipments: inProgress,
        completed,
      };
    }
    if (isCarrier) {
      return {
        requests: myRequests.length,
        offers: carrierOffers.length,
        shipments: inProgress,
        completed,
      };
    }
    // Terminal
    return { requests: myRequests.length, offers: 0, shipments: 0, completed: 0 };
  }, [myRequests, myShipments, carrierOffers, isForwarder, isCarrier, pendingReceivedCount]);

  const recentItems = myRequests.slice(0, 8);
  const dataLoading = reqLoading || shipLoading;

  if (loading || (dataLoading && myRequests.length === 0 && myShipments.length === 0)) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="space-y-6">
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  const getStatCards = () => {
    if (isForwarder) {
      return [
        { label: t('dashboard.activeRequests'), value: stats.requests, icon: FileText, path: '/requests' },
        { label: t('dashboard.pendingOffers'), value: stats.offers, icon: Inbox, path: '/offers?tab=received' },
        { label: t('dashboard.activeShipments'), value: stats.shipments, icon: Truck, path: '/shipments' },
        { label: t('dashboard.completedShipments'), value: stats.completed, icon: CheckCircle, path: '/shipments' },
      ];
    } else if (isCarrier) {
      return [
        { label: t('dashboard.openMarketplace'), value: stats.requests, icon: FileText, path: '/marketplace' },
        { label: t('dashboard.mySubmittedOffers'), value: stats.offers, icon: Send, path: '/offers?tab=submitted' },
        { label: t('dashboard.activeShipments'), value: stats.shipments, icon: Truck, path: '/shipments' },
        { label: t('dashboard.completedShipments'), value: stats.completed, icon: CheckCircle, path: '/shipments' },
      ];
    } else {
      return [
        { label: t('dashboard.totalRequests'), value: stats.requests, icon: FileText, path: '/marketplace' },
      ];
    }
  };

  const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    published: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    open: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    offers_received: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    accepted: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    assigned: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    in_transit: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    in_progress: { bg: 'bg-brand-tint', text: 'text-brand', dot: 'bg-brand' },
    delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  };

  const getStatusStyle = (status: string) => STATUS_STYLES[status] || STATUS_STYLES.draft;

  const getPrimaryAction = () => {
    if (isForwarder) {
      return { label: t('dashboard.newRequest'), path: '/requests' };
    } else if (isCarrier) {
      return { label: t('dashboard.browseRequests'), path: '/marketplace' };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();
  const statCards = getStatCards();

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[30px] font-extrabold text-gray-900 tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-gray-500 mt-1.5 text-[14.5px]">
              {t('dashboard.welcome')}
            </p>
          </div>
          {primaryAction && (
            <Button
              onClick={() => navigate(primaryAction.path)}
              className="bg-brand hover:bg-brand/90 text-white rounded-lg font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              {primaryAction.label}
            </Button>
          )}
        </div>

        {/* Overview strip — one bordered panel, divided into cells via a background gap-line trick */}
        <div
          className={`grid grid-cols-2 ${statCards.length > 2 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-px bg-gray-100 border border-gray-200 rounded-2xl shadow-[0_1px_2px_rgba(20,24,31,0.04),0_10px_24px_-16px_rgba(20,24,31,0.18)] overflow-hidden`}
        >
          {statCards.map((stat) => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="text-left p-5 flex flex-col gap-2 bg-white transition-colors hover:bg-gray-50"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-500">
                <stat.icon className="w-3.5 h-3.5 text-gray-400" />
                {stat.label}
              </span>
              <span className={`text-[28px] font-extrabold tracking-tight leading-none ${stat.value === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                {stat.value}
              </span>
            </button>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-[0_1px_2px_rgba(20,24,31,0.04),0_10px_24px_-16px_rgba(20,24,31,0.18)] overflow-hidden">
          <div className="flex items-baseline justify-between px-6 py-5 border-b border-gray-100">
            <h2 className="text-[16px] font-bold text-gray-900">{t('dashboard.recentActivity')}</h2>
          </div>

          {recentItems.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">{t('dashboard.noTransports')}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('dashboard.loading')}</th>
                      <th className="text-left px-3 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('dashboard.unloading')}</th>
                      <th className="text-left px-3 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('dashboard.containerType')}</th>
                      {isForwarder && (
                        <th className="text-left px-3 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('dashboard.carrier')}</th>
                      )}
                      <th className="text-left px-3 py-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{t('common.status')}</th>
                      <th className="px-6 py-3 w-[110px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentItems.map((req: any) => {
                      const s = getStatusStyle(req.status);
                      const carrier = carrierByRequestId[req.id];
                      return (
                        <tr key={req.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 align-middle">
                            <div className="flex items-start gap-2.5">
                              <Flag code={req.origin_country} />
                              <div>
                                <div className="text-[14px] font-bold text-gray-900 leading-snug">{req.origin || 'N/A'}</div>
                                <div className="text-[12px] text-gray-400 mt-0.5">{req.preferred_date || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-middle">
                            <div className="flex items-start gap-2.5">
                              <Flag code={req.destination_country} />
                              <div>
                                <div className="text-[14px] font-bold text-gray-900 leading-snug">{req.destination || 'N/A'}</div>
                                <div className="text-[12px] text-gray-400 mt-0.5">—</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div className="w-[30px] h-[30px] rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                                <Container className="w-[15px] h-[15px]" />
                              </div>
                              <div>
                                <div className="text-[13.5px] font-semibold text-gray-900">{req.container_type || 'N/A'}</div>
                                <div className="text-[11.5px] text-gray-400">
                                  {CONTAINER_LABELS[req.container_type] || 'Equipment'}
                                  {(req.container_count || 1) > 1 ? ` × ${req.container_count}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          {isForwarder && (
                            <td className="px-3 py-4 align-middle">
                              {carrier ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10.5px] font-bold shrink-0">
                                    {carrier.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-[13px] font-semibold text-gray-900">{carrier}</span>
                                </div>
                              ) : (
                                <span className="text-[13px] text-gray-300">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-4 align-middle">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${s.bg} ${s.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {t(`status.${req.status}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right align-middle">
                            {isForwarder && (req.status === 'published' || req.status === 'offers_received' || req.status === 'in_progress') && (
                              <button
                                onClick={() => navigate(`/offers?request_id=${req.id}`)}
                                className="text-brand hover:text-brand/80 text-[13px] font-semibold"
                              >
                                {t('requests.viewOffers')}
                              </button>
                            )}
                            {isCarrier && (
                              <button
                                onClick={() => navigate('/marketplace')}
                                className="text-brand hover:text-brand/80 text-[13px] font-semibold"
                              >
                                {t('marketplace.submitOffer')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden space-y-2 p-4">
                {recentItems.map((req: any) => {
                  const s = getStatusStyle(req.status);
                  return (
                    <div
                      key={req.id}
                      className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 min-w-0">
                          <Flag code={req.origin_country} className="w-4 h-3" />
                          <span className="truncate">{req.origin || 'N/A'}</span>
                          <span className="text-gray-300">→</span>
                          <Flag code={req.destination_country} className="w-4 h-3" />
                          <span className="truncate">{req.destination || 'N/A'}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${s.bg} ${s.text}`}>
                          <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                          {t(`status.${req.status}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 truncate">
                          {CONTAINER_LABELS[req.container_type] || req.container_type || 'N/A'}
                          {req.preferred_date ? ` • ${req.preferred_date}` : ''}
                        </span>
                        {isForwarder &&
                          (req.status === 'published' || req.status === 'offers_received' || req.status === 'in_progress') && (
                            <button
                              onClick={() => navigate(`/offers?request_id=${req.id}`)}
                              className="text-brand text-xs font-semibold shrink-0"
                            >
                              {t('requests.viewOffers')}
                            </button>
                          )}
                        {isCarrier && (
                          <button
                            onClick={() => navigate('/marketplace')}
                            className="text-brand text-xs font-semibold shrink-0"
                          >
                            {t('marketplace.submitOffer')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
