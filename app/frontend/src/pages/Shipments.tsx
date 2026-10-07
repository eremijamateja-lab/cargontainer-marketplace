import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, formatDeliveredLabel, formatTransportCategoryLabel, formatAdditionalServiceLabel, formatNextActionLabel } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  useMyShipments,
  useMyOffers,
  useUpdateTrackingLink,
  useUpdateShipmentStatus,
  useUpdateDriverDetails,
} from '@/hooks/useAppQueries';
import Layout from '@/components/Layout';
import { ShipmentCardSkeleton } from '@/components/Skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  MapPin,
  ArrowRight,
  Truck,
  Calendar,
  Package,
  ExternalLink,
  CheckCircle2,
  Circle,
  Link2,
  Loader2,
  ChevronRight,
  ChevronDown,
  Clock,
  Send,
  Hourglass,
  Phone,
  MessageCircle,
  Share2,
  User,
  Check,
  FileText,
  Pencil,
  ClipboardList,
  Filter,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { TRANSPORT_TYPE_MAP, CATEGORY_MAP, SERVICE_MAP, parseServices, COUNTRY_MAP } from '@/lib/constants';
import Flag from '@/components/Flag';

const STATUS_STEPS = [
  'booked',
  'picked_up',
  'in_transit',
  'border_exit',
  'in_transit_2',
  'customs',
  'in_transit_3',
  'arrived_at_delivery',
  'unloaded',
  'delivered',
] as const;

const getStepLabel = (step: string): string => t(`shipmentStatus.${step}`) || step;
const getStepLabelFull = (step: string): string => t(`shipmentStatusDetail.${step}`) || step;

interface MilestoneEntry {
  timestamp: string;
  updated_by?: string;
}

function parseMilestoneHistory(raw: string | null | undefined): Record<string, MilestoneEntry> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

// ─── Quick Contact Actions (directly on card) ───
function QuickContactActions({
  driverPhone,
  driverName,
}: {
  driverPhone?: string | null;
  driverName?: string | null;
}) {
  if (!driverPhone) return null;
  const cleanPhone = driverPhone.replace(/[^0-9+]/g, '');

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      <a
        href={`tel:${cleanPhone}`}
        className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 text-[10px] sm:text-xs font-medium transition-colors min-h-[24px] sm:min-h-[32px]"
        title={`Call ${driverName || 'driver'}`}
      >
        <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">Call</span>
      </a>
      <a
        href={`https://wa.me/${cleanPhone.replace('+', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] sm:text-xs font-medium transition-colors min-h-[24px] sm:min-h-[32px]"
        title="WhatsApp"
      >
        <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">WA</span>
      </a>
      <a
        href={`viber://chat?number=${cleanPhone.replace('+', '%2B')}`}
        className="inline-flex items-center justify-center gap-0.5 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-[10px] sm:text-xs font-medium transition-colors min-h-[24px] sm:min-h-[32px]"
        title="Viber"
      >
        <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">Viber</span>
      </a>
    </div>
  );
}

// ─── Share Shipment ───
function ShareButton({ shipment }: { shipment: any }) {
  const [copied, setCopied] = useState(false);

  const getShareText = () => {
    const sections: string[] = [];

    // Header — shipment ID
    sections.push(`📦 Shipment: ${shipment.tracking_number || `#${shipment.id}`}`);

    // Route
    sections.push(`📍 ${shipment.origin || 'N/A'} → ${shipment.destination || 'N/A'}`);

    // Status
    sections.push(`📊 Status: ${getStepLabel(shipment.status)}`);

    // Service providers (carrier + customs)
    const providers: string[] = [];
    if (shipment.carrier_name) providers.push(`🚛 ${t('shipments.carrier')}: ${shipment.carrier_name}`);
    if (shipment.customs_agent_name) providers.push(`🛃 ${t('shipments.customsAgent')}: ${shipment.customs_agent_name}`);
    if (providers.length > 0) sections.push(providers.join('\n'));

    // Driver
    if (shipment.driver_name || shipment.driver_phone) {
      const driverLines = ['👤 Driver:'];
      if (shipment.driver_name) driverLines.push(shipment.driver_name);
      if (shipment.driver_phone) driverLines.push(shipment.driver_phone);
      sections.push(driverLines.join('\n'));
    }

    // Vehicle
    const plates = [shipment.vehicle_plate, shipment.trailer_plate].filter(Boolean);
    if (plates.length > 0) {
      sections.push(`🚚 Vehicle:\n${plates.join(' / ')}`);
    }

    // Container
    if (shipment.container_number) {
      sections.push(`📦 Container:\n${shipment.container_number}`);
    }

    // Forwarder instruction
    if (shipment.forwarder_notes) {
      sections.push(`📝 Instruction:\n${shipment.forwarder_notes}`);
    }

    // Carrier note
    if (shipment.operational_notes) {
      sections.push(`🚛 Carrier Note:\n${shipment.operational_notes}`);
    }

    // Tracking link — always last, only if exists
    if (shipment.tracking_link) {
      sections.push(`🔗 Track Shipment:\n${shipment.tracking_link}`);
    }

    return sections.join('\n\n');
  };

  const handleShare = async () => {
    const text = getShareText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Shipment ${shipment.tracking_number || `#${shipment.id}`}`,
          text,
        });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('toast.copiedSuccess'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('toast.copiedFail'));
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleShare}
      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-9 w-9 p-0"
      title="Share shipment"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
    </Button>
  );
}

export default function Shipments() {
  const navigate = useNavigate();
  useLanguage(); // Subscribe to language changes for re-render
  const { user, profile, isAdmin, loading, handleLogout } = useAuth();
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [forwarderDialogOpen, setForwarderDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [trackingInput, setTrackingInput] = useState('');
  // Carrier form state
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [carrierEmail, setCarrierEmail] = useState('');
  const [carrierPhone, setCarrierPhone] = useState('');
  const [operationalNotes, setOperationalNotes] = useState('');
  // Forwarder form state
  const [forwarderNotes, setForwarderNotes] = useState('');

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  // Expanded milestone history
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set());

  const role = profile?.role || 'forwarder';
  const isCarrier = role === 'trucking' || role === 'rail';

  // React Query hooks
  const {
    data: shipments = [],
    isLoading: dataLoading,
    isFetching,
  } = useMyShipments(!!profile);

  const { data: carrierOffers = [] } = useMyOffers(!!profile && isCarrier);

  const updateTrackingMutation = useUpdateTrackingLink();
  const updateStatusMutation = useUpdateShipmentStatus();
  const updateDriverMutation = useUpdateDriverDetails();

  // Unique categories and countries for filter pills
  const usedCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of shipments as any[]) {
      if (s.transport_category) cats.add(s.transport_category);
    }
    return Array.from(cats).sort();
  }, [shipments]);

  const usedCountries = useMemo(() => {
    const codes = new Set<string>();
    for (const s of shipments as any[]) {
      if (s.origin_country) codes.add(s.origin_country);
      if (s.destination_country) codes.add(s.destination_country);
    }
    return Array.from(codes).sort();
  }, [shipments]);

  const hasActiveFilters = filterCategory || filterCountry;

  // Filtered then separate active vs delivered
  const { activeShipments, deliveredShipments } = useMemo(() => {
    let filtered = shipments as any[];
    if (filterCategory) {
      filtered = filtered.filter((s: any) => s.transport_category === filterCategory);
    }
    if (filterCountry) {
      filtered = filtered.filter(
        (s: any) => s.origin_country === filterCountry || s.destination_country === filterCountry
      );
    }
    const active: any[] = [];
    const delivered: any[] = [];
    for (const s of filtered) {
      if (s.status === 'delivered') {
        delivered.push(s);
      } else {
        active.push(s);
      }
    }
    return { activeShipments: active, deliveredShipments: delivered };
  }, [shipments, filterCategory, filterCountry]);

  const handleOpenTrackingDialog = (shipment: any) => {
    setSelectedShipment(shipment);
    setTrackingInput(shipment.tracking_link || '');
    setTrackingDialogOpen(true);
  };

  const handleOpenCarrierDialog = (shipment: any) => {
    setSelectedShipment(shipment);
    setDriverName(shipment.driver_name || '');
    setDriverPhone(shipment.driver_phone || '');
    setVehiclePlate(shipment.vehicle_plate || '');
    setTrailerPlate(shipment.trailer_plate || '');
    setContainerNumber(shipment.container_number || '');
    setCarrierEmail(shipment.carrier_email || '');
    setCarrierPhone(shipment.carrier_phone || '');
    setOperationalNotes(shipment.operational_notes || '');
    setCarrierDialogOpen(true);
  };

  const handleOpenForwarderDialog = (shipment: any) => {
    setSelectedShipment(shipment);
    setForwarderNotes(shipment.forwarder_notes || '');
    setForwarderDialogOpen(true);
  };

  const handleSubmitTracking = () => {
    if (!selectedShipment?.request_id || !trackingInput.trim()) return;
    updateTrackingMutation.mutate(
      {
        request_id: selectedShipment.request_id,
        tracking_link: trackingInput.trim(),
      },
      { onSuccess: () => setTrackingDialogOpen(false) }
    );
  };

  const handleSaveCarrierDetails = () => {
    if (!selectedShipment) return;
    updateDriverMutation.mutate(
      {
        shipment_id: selectedShipment.id,
        driver_name: driverName || undefined,
        driver_phone: driverPhone || undefined,
        vehicle_plate: vehiclePlate || undefined,
        trailer_plate: trailerPlate || undefined,
        container_number: containerNumber || undefined,
        carrier_email: carrierEmail || undefined,
        carrier_phone: carrierPhone || undefined,
        operational_notes: operationalNotes || undefined,
      },
      { onSuccess: () => setCarrierDialogOpen(false) }
    );
  };

  const handleSaveForwarderNotes = () => {
    if (!selectedShipment) return;
    updateDriverMutation.mutate(
      {
        shipment_id: selectedShipment.id,
        forwarder_notes: forwarderNotes || undefined,
      },
      { onSuccess: () => setForwarderDialogOpen(false) }
    );
  };

  const handleAdvanceStatus = (shipment: any) => {
    const currentIdx = STATUS_STEPS.indexOf(shipment.status);
    if (currentIdx < 0 || currentIdx >= STATUS_STEPS.length - 1) return;
    const nextStatus = STATUS_STEPS[currentIdx + 1];
    updateStatusMutation.mutate({
      shipment_id: shipment.id,
      status: nextStatus,
      vehicle_plate: shipment.vehicle_plate || undefined,
      container_number: shipment.container_number || undefined,
    });
  };

  const getStatusIndex = (status: string) =>
    STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      booked: 'bg-blue-50 text-blue-700 border-blue-200',
      picked_up: 'bg-amber-50 text-amber-700 border-amber-200',
      in_transit: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      border_exit: 'bg-orange-50 text-orange-700 border-orange-200',
      customs: 'bg-purple-50 text-purple-700 border-purple-200',
      arrived_at_delivery: 'bg-teal-50 text-teal-700 border-teal-200',
      unloaded: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getNextStatusLabel = (status: string) => {
    const idx = getStatusIndex(status);
    if (idx < 0 || idx >= STATUS_STEPS.length - 1) return null;
    return formatNextActionLabel(STATUS_STEPS[idx + 1]);
  };

  if (loading || (dataLoading && shipments.length === 0)) {
    return (
      <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t('shipments.title')}</h1>
          </div>
          <div className="grid gap-4">
            <ShipmentCardSkeleton />
            <ShipmentCardSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  const renderShipmentCard = (shipment: any, isReadOnly: boolean) => {
    const currentIdx = getStatusIndex(shipment.status || 'booked');
    const delivered = shipment.status === 'delivered';
    const nextLabel = getNextStatusLabel(shipment.status);
    const updatedAt = formatTimestamp(shipment.updated_at);
    const hasDriver = shipment.driver_name || shipment.driver_phone;
    const hasCarrierNote = !!shipment.operational_notes;
    const hasForwarderNote = !!shipment.forwarder_notes;
    const hasVehicleInfo = shipment.vehicle_plate || shipment.trailer_plate || shipment.container_number;
    const milestoneHistory = parseMilestoneHistory(shipment.milestone_history);

    return (
      <Card
        key={shipment.id}
        className={`bg-white border-gray-200 transition-all overflow-hidden ${
          delivered ? 'opacity-75' : ''
        }`}
      >
        <CardContent className="p-2.5 sm:p-5 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-[11px] sm:text-sm font-semibold text-gray-900 truncate">
                  {shipment.tracking_number || `#${shipment.id}`}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] sm:text-xs font-medium shrink-0 px-1 py-0 sm:px-2 sm:py-0.5 leading-tight ${getStatusBadge(shipment.status)}`}
                >
                  {getStepLabel(shipment.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-0.5 sm:gap-1.5 text-[11px] sm:text-sm text-gray-600 min-w-0 overflow-hidden mt-0.5">
                {shipment.origin_country && (
                  <Flag code={shipment.origin_country} className="w-4 h-3 sm:w-[18px] sm:h-[13px]" />
                )}
                <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-600 shrink-0" />
                <span className="truncate min-w-0">{shipment.origin || 'N/A'}</span>
                <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                {shipment.destination_country && (
                  <Flag code={shipment.destination_country} className="w-4 h-3 sm:w-[18px] sm:h-[13px]" />
                )}
                <span className="truncate min-w-0">{shipment.destination || 'N/A'}</span>
                {TRANSPORT_TYPE_MAP[shipment.transport_category] && (
                  <Badge variant="outline" className={`text-[8px] sm:text-[10px] px-1 py-0 sm:px-1.5 leading-tight shrink-0 ${TRANSPORT_TYPE_MAP[shipment.transport_category].color}`}>
                    {TRANSPORT_TYPE_MAP[shipment.transport_category].emoji} {formatTransportCategoryLabel(shipment.transport_category)}
                  </Badge>
                )}
                {parseServices(shipment.additional_services).map((svc: string) => {
                  const svcInfo = SERVICE_MAP[svc];
                  if (!svcInfo) return null;
                  return (
                    <Badge key={svc} variant="outline" className={`text-[8px] sm:text-[10px] px-1 py-0 sm:px-1.5 leading-tight shrink-0 ${svcInfo.color}`}>
                      {svcInfo.emoji} {formatAdditionalServiceLabel(svc)}
                    </Badge>
                  );
                })}
                {shipment.estimated_arrival && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-500 ml-2">
                    <Calendar className="w-3 h-3" />
                    ETA: {shipment.estimated_arrival}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {shipment.estimated_arrival && (
                <span className="sm:hidden flex items-center gap-0.5 text-[9px] text-gray-400">
                  <Calendar className="w-2.5 h-2.5" />
                  {shipment.estimated_arrival}
                </span>
              )}
              <ShareButton shipment={shipment} />
            </div>
          </div>

          {/* ─── Service Providers: Transport Carrier + Customs Agent ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
            {/* Transport Carrier */}
            {shipment.carrier_name && (
              <div className="bg-blue-50/60 rounded p-1.5 sm:rounded-lg sm:p-3 border border-blue-100 overflow-hidden">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Truck className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                      <span className="text-[11px] sm:text-sm font-semibold text-blue-900 truncate">
                        {shipment.carrier_name}
                      </span>
                      <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                        {t('shipments.carrier')}
                      </Badge>
                    </div>
                    {(shipment.carrier_phone || shipment.carrier_email) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {shipment.carrier_phone && (
                          <span className="text-[9px] sm:text-xs text-blue-600/70">{shipment.carrier_phone}</span>
                        )}
                        {shipment.carrier_email && (
                          <span className="text-[9px] sm:text-xs text-blue-600/70 truncate">{shipment.carrier_email}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Driver info nested under carrier */}
                {hasDriver && (
                  <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-blue-100/60">
                    <div className="flex items-center justify-between gap-1 sm:gap-2">
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                        <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-blue-100/60 flex items-center justify-center shrink-0">
                          <User className="w-2 h-2 sm:w-3 sm:h-3 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            {shipment.driver_name && (
                              <span className="text-[10px] sm:text-xs font-medium text-gray-800 truncate">
                                {shipment.driver_name}
                              </span>
                            )}
                            {shipment.driver_phone && (
                              <span className="text-[9px] sm:text-[11px] text-gray-400 truncate">
                                {shipment.driver_phone}
                              </span>
                            )}
                          </div>
                          {/* Vehicle badges */}
                          {hasVehicleInfo && (
                            <div className="flex flex-wrap items-center gap-0.5 mt-0.5 overflow-hidden">
                              {(shipment.vehicle_plate || shipment.trailer_plate) && (
                                <span className="bg-white border border-blue-100 px-1 py-px rounded text-[8px] sm:text-[10px] text-gray-500 font-medium truncate">
                                  🚛 {[shipment.vehicle_plate, shipment.trailer_plate].filter(Boolean).join(' · ')}
                                </span>
                              )}
                              {shipment.container_number && (
                                <span className="bg-white border border-blue-100 px-1 py-px rounded text-[8px] sm:text-[10px] text-gray-500 font-medium truncate">
                                  📦 {shipment.container_number}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <QuickContactActions
                        driverPhone={shipment.driver_phone}
                        driverName={shipment.driver_name}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customs / T1 Provider */}
            {(shipment.customs_agent_name || parseServices(shipment.additional_services).includes('customs_t1')) && (
              <div className={`rounded p-1.5 sm:rounded-lg sm:p-3 border overflow-hidden ${
                shipment.customs_agent_name
                  ? 'bg-amber-50/60 border-amber-100'
                  : 'bg-gray-50 border-dashed border-gray-200'
              }`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 ${
                    shipment.customs_agent_name ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    <span className="text-[10px] sm:text-sm">🛃</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {shipment.customs_agent_name ? (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <span className="text-[11px] sm:text-sm font-semibold text-amber-800 truncate">
                          {shipment.customs_agent_name}
                        </span>
                        <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                          {t('shipments.customsAgent')}
                        </Badge>
                        {shipment.customs_status && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                            {shipment.customs_status}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-gray-400 italic">
                        {t('shipments.awaitingCustoms')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Notes Section (two separate notes with clear ownership) ─── */}
          {(hasCarrierNote || hasForwarderNote) && (
            <div className="space-y-1 sm:space-y-2 mb-1.5 sm:mb-3">
              {/* Carrier Note */}
              {hasCarrierNote && (
                <div className="bg-amber-50 border border-amber-100 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <div className="flex items-start gap-1 sm:gap-2">
                    <Truck className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] sm:text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                        {t('shipments.carrierNote')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-amber-800 leading-tight sm:leading-relaxed whitespace-pre-line">
                        {shipment.operational_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Forwarder Instruction */}
              {hasForwarderNote && (
                <div className="bg-blue-50 border border-blue-100 rounded px-2 sm:px-3 py-1 sm:py-2">
                  <div className="flex items-start gap-1 sm:gap-2">
                    <ClipboardList className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] sm:text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                        {t('shipments.forwarderInstruction')}
                      </p>
                      <p className="text-[10px] sm:text-xs text-blue-800 leading-tight sm:leading-relaxed whitespace-pre-line">
                        {shipment.forwarder_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Timeline — compact 8-step */}
          <div className="relative mb-0 sm:mb-1">
            {/* Desktop timeline */}
            <div className="hidden sm:block">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div className="relative z-10">
                        {isCompleted ? (
                          <CheckCircle2
                            className={`w-5 h-5 ${
                              isCurrent ? 'text-blue-600' : 'text-emerald-500'
                            }`}
                          />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] mt-1 text-center leading-tight ${
                          isCompleted ? 'text-gray-700 font-medium' : 'text-gray-400'
                        }`}
                      >
                        {getStepLabel(step)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-gray-200 -z-0 mx-6">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width:
                      currentIdx >= 0
                        ? `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>

            {/* Mobile timeline — ultra-compact pills */}
            <div className="sm:hidden">
              <div className="flex flex-wrap items-center gap-px">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div
                      key={step}
                      className={`inline-flex items-center gap-px px-1 py-px rounded-full text-[8px] font-medium leading-none ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-700'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-2 h-2" />
                      ) : (
                        <Circle className="w-2 h-2" />
                      )}
                      <span className="ml-px">{getStepLabel(step)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expandable Milestone History */}
            {milestoneHistory && Object.keys(milestoneHistory).length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedHistory((prev) => {
                      const next = new Set(prev);
                      if (next.has(shipment.id)) next.delete(shipment.id);
                      else next.add(shipment.id);
                      return next;
                    });
                  }}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{t('shipments.statusHistoryToggle')}</span>
                  {expandedHistory.has(shipment.id) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {expandedHistory.has(shipment.id) && (
                  <div className="mt-1.5 pl-2 border-l-2 border-gray-200 space-y-1">
                    {STATUS_STEPS.filter((step) => milestoneHistory[step]).map((step, idx, arr) => {
                      const entry = milestoneHistory[step];
                      // Calculate duration from previous milestone
                      let duration = '';
                      if (idx > 0) {
                        const prevStep = arr[idx - 1];
                        const prevEntry = milestoneHistory[prevStep];
                        if (prevEntry?.timestamp && entry?.timestamp) {
                          const diff = new Date(entry.timestamp).getTime() - new Date(prevEntry.timestamp).getTime();
                          if (diff > 0) duration = formatDuration(diff);
                        }
                      }
                      return (
                        <div key={step} className="flex items-center gap-2 text-[10px] sm:text-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="font-medium text-gray-700">{getStepLabelFull(step)}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{formatTimestamp(entry.timestamp)}</span>
                          {duration && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-blue-500 font-medium">+{duration}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: tracking + actions */}
          <div className="mt-1.5 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {/* Tracking link */}
              {shipment.tracking_link && (
                <a
                  href={shipment.tracking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  {t('shipments.track')}
                </a>
              )}
              {/* Action buttons — role-specific, ultra-compact on mobile */}
              {!isReadOnly && (
                <>
                  {isCarrier && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenCarrierDialog(shipment)}
                      className="border-gray-200 text-gray-600 hover:bg-gray-50 text-[10px] sm:text-xs h-6 sm:h-9 px-1.5 sm:px-3 min-w-0"
                    >
                      <Pencil className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" />
                      {t('shipments.edit')}
                    </Button>
                  )}
                  {!isCarrier && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenForwarderDialog(shipment)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] sm:text-xs h-6 sm:h-9 px-1.5 sm:px-3 min-w-0"
                    >
                      <ClipboardList className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" />
                      <span className="hidden sm:inline">{shipment.forwarder_notes ? t('shipments.editInstruction') : t('shipments.addInstruction')}</span>
                      <span className="sm:hidden">{shipment.forwarder_notes ? t('shipments.edit') : t('shipments.note')}</span>
                    </Button>
                  )}
                  {isCarrier && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenTrackingDialog(shipment)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] sm:text-xs h-6 sm:h-9 px-1.5 sm:px-3 min-w-0"
                    >
                      <Link2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" />
                      {t('shipments.trackingUrl')}
                    </Button>
                  )}
                  {isCarrier && nextLabel && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(shipment)}
                      disabled={updateStatusMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs h-6 sm:h-9 px-1.5 sm:px-3 min-w-0 ml-auto"
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5 animate-spin" />
                      ) : (
                        <ChevronRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-0.5" />
                      )}
                      {nextLabel}
                    </Button>
                  )}
                </>
              )}
              {/* Updated timestamp — inline on mobile */}
              {updatedAt && (
                <span className="flex items-center gap-0.5 text-[8px] sm:text-[10px] text-gray-400 ml-auto sm:ml-0">
                  <Clock className="w-2 h-2 sm:w-3 sm:h-3" />
                  {updatedAt}
                </span>
              )}
            </div>

            {/* Delivered badge */}
            {delivered && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-emerald-600 bg-emerald-50 rounded-md sm:rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 mt-1.5 sm:mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-medium">
                  {formatDeliveredLabel(shipment.actual_arrival ? formatTimestamp(shipment.actual_arrival) : undefined)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout user={user} profile={profile} isAdmin={isAdmin} onLogout={handleLogout}>
      <div className="space-y-3 sm:space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('shipments.title')}</h1>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </div>

        {/* Filter Bar */}
        {shipments.length > 0 && (usedCategories.length > 0 || usedCountries.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <button
              onClick={() => { setFilterCategory(''); setFilterCountry(''); }}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                !hasActiveFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('filter.all')}
            </button>
            {usedCategories.map((cat) => {
              const info = CATEGORY_MAP[cat];
              if (!info) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {info.emoji} {formatTransportCategoryLabel(cat)}
                </button>
              );
            })}
            {usedCountries.length > 0 && usedCategories.length > 0 && (
              <span className="text-gray-300">|</span>
            )}
            {usedCountries.map((code) => (
              <button
                key={code}
                onClick={() => setFilterCountry(filterCountry === code ? '' : code)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                  filterCountry === code
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Flag code={code} className="w-3.5 h-2.5" /> {COUNTRY_MAP[code] || code}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterCategory(''); setFilterCountry(''); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {t('filter.clearAll')}
              </button>
            )}
          </div>
        )}

        {shipments.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-12 text-center">
              {isCarrier ? (
                <>
                  <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  {carrierOffers.length > 0 ? (
                    <>
                      <p className="text-gray-700 font-medium mb-1">
                        {t('shipments.noActiveTransportsYet')}
                      </p>
                      <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                        <span className="font-semibold text-blue-600">
                          {carrierOffers.length}
                        </span>{' '}
                        {t('shipments.pendingOffersAwaiting')}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
                        <Hourglass className="w-4 h-4" />
                        <span>{t('shipments.waitingForForwarder')}</span>
                      </div>
                      <Button
                        onClick={() => navigate('/marketplace')}
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t('shipments.browseMoreRequests')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium mb-1">{t('shipments.noTransportsYet')}</p>
                      <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                        {t('shipments.noTransportsHint')}
                      </p>
                      <Button
                        onClick={() => navigate('/marketplace')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t('shipments.goToMarketplace')}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-1">{t('shipments.noShipmentsYet')}</p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                    {t('shipments.noShipmentsHint')}
                  </p>
                  <Button
                    onClick={() => navigate('/requests')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('shipments.viewMyRequests')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5 sm:space-y-8">
            {activeShipments.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {t('shipments.activeTransports')} ({activeShipments.length})
                </h2>
                <div className="grid gap-2 sm:gap-3">
                  {activeShipments.map((s: any) => renderShipmentCard(s, false))}
                </div>
              </div>
            )}
            {deliveredShipments.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {t('shipments.completedTransports')} ({deliveredShipments.length})
                </h2>
                <div className="grid gap-2 sm:gap-3">
                  {deliveredShipments.map((s: any) => renderShipmentCard(s, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tracking Link Dialog */}
        <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedShipment?.tracking_link ? t('shipments.updateTrackingLink') : t('shipments.addTrackingLink')}
              </DialogTitle>
            </DialogHeader>
            {selectedShipment && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedShipment.origin} → {selectedShipment.destination}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedShipment.tracking_number}
                  </p>
                </div>
                <div>
                  <Label>{t('shipments.trackingUrl')} *</Label>
                  <Input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="mt-1"
                    placeholder="https://tracking.example.com/..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {t('shipments.trackingUrlHint')}
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setTrackingDialogOpen(false)}
                    disabled={updateTrackingMutation.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmitTracking}
                    disabled={updateTrackingMutation.isPending || !trackingInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updateTrackingMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('shipments.saving')}
                      </>
                    ) : (
                      t('shipments.save')
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Carrier Edit Dialog — driver/vehicle/carrier note */}
        <Dialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                {t('shipments.driverVehicleDetails')}
              </DialogTitle>
            </DialogHeader>
            {selectedShipment && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedShipment.origin} → {selectedShipment.destination}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedShipment.tracking_number}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>{t('shipments.driverName')}</Label>
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. Ivan Petrov"
                    />
                  </div>
                  <div>
                    <Label>{t('shipments.driverPhone')}</Label>
                    <Input
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. +359888123456"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t('shipments.vehiclePlate')}</Label>
                      <Input
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value)}
                        className="mt-1"
                        placeholder="BG-1234-AB"
                      />
                    </div>
                    <div>
                      <Label>{t('shipments.trailerPlate')}</Label>
                      <Input
                        value={trailerPlate}
                        onChange={(e) => setTrailerPlate(e.target.value)}
                        className="mt-1"
                        placeholder="BG-5678-CD"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t('shipments.containerNumber')}</Label>
                    <Input
                      value={containerNumber}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. MSKU1234567"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t('shipments.carrierEmail')}</Label>
                      <Input
                        value={carrierEmail}
                        onChange={(e) => setCarrierEmail(e.target.value)}
                        className="mt-1"
                        placeholder="dispatch@co.com"
                        type="email"
                      />
                    </div>
                    <div>
                      <Label>{t('shipments.carrierPhone')}</Label>
                      <Input
                        value={carrierPhone}
                        onChange={(e) => setCarrierPhone(e.target.value)}
                        className="mt-1"
                        placeholder="+359..."
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t('shipments.carrierNote')}</Label>
                    <Textarea
                      value={operationalNotes}
                      onChange={(e) => setOperationalNotes(e.target.value)}
                      className="mt-1 min-h-[80px]"
                      placeholder="e.g. Driver will arrive around 10:00&#10;Truck has ADR certificate&#10;Available for loading after 14:00"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('shipments.carrierNoteHint')}
                    </p>
                  </div>
                </div>

                {/* Show forwarder instruction (read-only for carrier) */}
                {selectedShipment.forwarder_notes && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-0.5">
                      {t('shipments.forwarderInstructionReadOnly')}
                    </p>
                    <p className="text-xs text-blue-800 whitespace-pre-line">
                      {selectedShipment.forwarder_notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setCarrierDialogOpen(false)}
                    disabled={updateDriverMutation.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveCarrierDetails}
                    disabled={updateDriverMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updateDriverMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('shipments.saving')}
                      </>
                    ) : (
                      t('shipments.saveDetails')
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Forwarder Instruction Dialog */}
        <Dialog open={forwarderDialogOpen} onOpenChange={setForwarderDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {t('shipments.forwarderInstruction')}
              </DialogTitle>
            </DialogHeader>
            {selectedShipment && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedShipment.origin} → {selectedShipment.destination}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedShipment.tracking_number} •{' '}
                    {t('shipments.carrier')}: {selectedShipment.carrier_name || 'N/A'}
                  </p>
                </div>

                <div>
                  <Label>{t('shipments.yourInstructionToCarrier')}</Label>
                  <Textarea
                    value={forwarderNotes}
                    onChange={(e) => setForwarderNotes(e.target.value)}
                    className="mt-1 min-h-[100px]"
                    placeholder="e.g. Driver must report to EuroRail forwarding office before loading&#10;Go to ramp 3 first&#10;Call warehouse before arrival&#10;Terminal reference: ABC-123"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {t('shipments.forwarderInstructionHint')}
                  </p>
                </div>

                {/* Show carrier note (read-only for forwarder) */}
                {selectedShipment.operational_notes && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                      {t('shipments.carrierNoteReadOnly')}
                    </p>
                    <p className="text-xs text-amber-800 whitespace-pre-line">
                      {selectedShipment.operational_notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setForwarderDialogOpen(false)}
                    disabled={updateDriverMutation.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveForwarderNotes}
                    disabled={updateDriverMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updateDriverMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('shipments.saving')}
                      </>
                    ) : (
                      t('shipments.saveInstruction')
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}