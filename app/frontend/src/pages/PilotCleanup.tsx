import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, getStatusLabel } from '@/lib/i18n';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Shield, CheckSquare, Square, AlertTriangle } from 'lucide-react';

interface TestItem {
  id: number;
  [key: string]: any;
}

interface ScanResult {
  counts: {
    rfqs: number;
    offers: number;
    shipments: number;
    companies: number;
    members: number;
  };
  test_rfqs: TestItem[];
  test_offers: TestItem[];
  test_shipments: TestItem[];
  test_companies: TestItem[];
  test_members: TestItem[];
}

interface ArchiveResult {
  success: boolean;
  results: {
    rfqs_archived: number;
    offers_archived: number;
    shipments_archived: number;
    companies_archived: number;
    members_archived: number;
    errors: string[];
  };
}

/**
 * Format a raw status value into a translated label.
 * Uses getStatusLabel for known statuses, plus handles archived_test.
 */
function formatStatus(raw: string): string {
  if (!raw) return '—';
  if (raw === 'archived_test') return t('admin.statusArchivedTest');
  // Try the status.* keys first
  const label = getStatusLabel(raw);
  // If getStatusLabel returns the raw key unchanged, return as-is
  return label;
}

export default function PilotCleanup() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();

  const [scanned, setScanned] = useState(false);
  const [selectedRfqs, setSelectedRfqs] = useState<Set<number>>(new Set());
  const [selectedOffers, setSelectedOffers] = useState<Set<number>>(new Set());
  const [selectedShipments, setSelectedShipments] = useState<Set<number>>(new Set());
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [archiveResult, setArchiveResult] = useState<ArchiveResult | null>(null);

  const scanQuery = useQuery<ScanResult>({
    queryKey: ['admin', 'pilot-cleanup-scan'],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/pilot-cleanup/scan',
        method: 'GET',
      });
      return res?.data ?? res;
    },
    enabled: scanned,
  });

  const archiveMutation = useMutation({
    mutationFn: async (payload: {
      rfq_ids: number[];
      offer_ids: number[];
      shipment_ids: number[];
      company_ids: number[];
      member_ids: number[];
    }) => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/pilot-cleanup/archive',
        method: 'POST',
        data: payload,
      });
      return (res?.data ?? res) as ArchiveResult;
    },
    onSuccess: (data) => {
      setArchiveResult(data);
      setShowConfirmModal(false);
      setConfirmText('');
      setSelectedRfqs(new Set());
      setSelectedOffers(new Set());
      setSelectedShipments(new Set());
      setSelectedCompanies(new Set());
      setSelectedMembers(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'pilot-cleanup-scan'] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const handleScan = () => {
    setScanned(true);
    setArchiveResult(null);
  };

  const toggleItem = (set: Set<number>, setFn: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFn(next);
  };

  const selectAllInCategory = (items: TestItem[], setFn: React.Dispatch<React.SetStateAction<Set<number>>>) => {
    setFn(new Set(items.map((i) => i.id)));
  };

  const deselectAllInCategory = (setFn: React.Dispatch<React.SetStateAction<Set<number>>>) => {
    setFn(new Set());
  };

  const totalSelected =
    selectedRfqs.size + selectedOffers.size + selectedShipments.size + selectedCompanies.size + selectedMembers.size;

  const handleArchive = () => {
    if (confirmText !== 'DELETE') return;
    archiveMutation.mutate({
      rfq_ids: Array.from(selectedRfqs),
      offer_ids: Array.from(selectedOffers),
      shipment_ids: Array.from(selectedShipments),
      company_ids: Array.from(selectedCompanies),
      member_ids: Array.from(selectedMembers),
    });
  };

  const data = scanQuery.data;

  // Use lang in the key to force re-render on language change
  return (
    <div className="space-y-6" key={`cleanup-${lang}`}>
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900">{t('admin.pilotCleanup')}</h2>
        </div>
        <p className="text-sm text-amber-700">{t('admin.pilotCleanupDesc')}</p>
      </div>

      {/* Scan button */}
      {!scanned && (
        <Button onClick={handleScan} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Search className="w-4 h-4 mr-2" />
          {t('admin.scanTestData')}
        </Button>
      )}

      {/* Loading */}
      {scanned && scanQuery.isLoading && (
        <div className="flex items-center gap-2 py-8 justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="text-gray-600">{t('admin.scanning')}</span>
        </div>
      )}

      {/* Archive result summary */}
      {archiveResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">{t('admin.cleanupComplete')}</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>{t('admin.rfqsArchived')}: {archiveResult.results.rfqs_archived}</li>
            <li>{t('admin.offersArchived')}: {archiveResult.results.offers_archived}</li>
            <li>{t('admin.shipmentsArchived')}: {archiveResult.results.shipments_archived}</li>
            <li>{t('admin.companiesArchived')}: {archiveResult.results.companies_archived}</li>
            <li>{t('admin.membersArchived')}: {archiveResult.results.members_archived}</li>
          </ul>
          {archiveResult.results.errors.length > 0 && (
            <div className="mt-3 border-t border-green-300 pt-2">
              <p className="text-sm font-medium text-red-700">{t('admin.cleanupErrors')}:</p>
              <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                {archiveResult.results.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Scan results */}
      {data && !scanQuery.isLoading && (
        <>
          {/* Summary counts */}
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-sm px-3 py-1">
              {t('admin.testRfqs')}: {data.counts.rfqs}
            </Badge>
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-sm px-3 py-1">
              {t('admin.testOffers')}: {data.counts.offers}
            </Badge>
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-sm px-3 py-1">
              {t('admin.testShipments')}: {data.counts.shipments}
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 text-sm px-3 py-1">
              {t('admin.testCompanies')}: {data.counts.companies}
            </Badge>
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-sm px-3 py-1">
              {t('admin.testMembers')}: {data.counts.members}
            </Badge>
          </div>

          {/* No test data */}
          {data.counts.rfqs === 0 && data.counts.offers === 0 && data.counts.shipments === 0 && data.counts.companies === 0 && data.counts.members === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>{t('admin.noTestData')}</p>
            </div>
          )}

          {/* Test Companies */}
          {data.test_companies.length > 0 && (
            <CategorySection
              lang={lang}
              title={t('admin.testCompanies')}
              items={data.test_companies}
              selected={selectedCompanies}
              setSelected={setSelectedCompanies}
              toggleItem={toggleItem}
              selectAll={selectAllInCategory}
              deselectAll={deselectAllInCategory}
              renderRow={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{item.company_name}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{item.country}</span>
                    <span className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    <Badge className="text-xs">{formatStatus(item.approval_status)}</Badge>
                  </div>
                </div>
              )}
            />
          )}

          {/* Test Members */}
          {data.test_members.length > 0 && (
            <CategorySection
              lang={lang}
              title={t('admin.testMembers')}
              items={data.test_members}
              selected={selectedMembers}
              setSelected={setSelectedMembers}
              toggleItem={toggleItem}
              selectAll={selectAllInCategory}
              deselectAll={deselectAllInCategory}
              renderRow={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{item.display_name}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{item.company_name}</span>
                    <span className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    <Badge className="text-xs">{formatStatus(item.member_status)}</Badge>
                  </div>
                </div>
              )}
            />
          )}

          {/* Test RFQs */}
          {data.test_rfqs.length > 0 && (
            <CategorySection
              lang={lang}
              title={t('admin.testRfqs')}
              items={data.test_rfqs}
              selected={selectedRfqs}
              setSelected={setSelectedRfqs}
              toggleItem={toggleItem}
              selectAll={selectAllInCategory}
              deselectAll={deselectAllInCategory}
              renderRow={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{item.title}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.user_company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{item.origin} → {item.destination}</span>
                    <span className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    <Badge className="text-xs">{formatStatus(item.status)}</Badge>
                  </div>
                </div>
              )}
            />
          )}

          {/* Test Offers */}
          {data.test_offers.length > 0 && (
            <CategorySection
              lang={lang}
              title={t('admin.testOffers')}
              items={data.test_offers}
              selected={selectedOffers}
              setSelected={setSelectedOffers}
              toggleItem={toggleItem}
              selectAll={selectAllInCategory}
              deselectAll={deselectAllInCategory}
              renderRow={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{item.carrier_name}</span>
                    <span className="ml-2 text-xs text-gray-500">RFQ #{item.request_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{item.price} {item.currency}</span>
                    <span className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    <Badge className="text-xs">{formatStatus(item.status)}</Badge>
                  </div>
                </div>
              )}
            />
          )}

          {/* Test Shipments */}
          {data.test_shipments.length > 0 && (
            <CategorySection
              lang={lang}
              title={t('admin.testShipments')}
              items={data.test_shipments}
              selected={selectedShipments}
              setSelected={setSelectedShipments}
              toggleItem={toggleItem}
              selectAll={selectAllInCategory}
              deselectAll={deselectAllInCategory}
              renderRow={(item) => (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{item.carrier_name}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.tracking_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{item.origin} → {item.destination}</span>
                    <span className="text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                    <Badge className="text-xs">{formatStatus(item.status)}</Badge>
                  </div>
                </div>
              )}
            />
          )}

          {/* Archive action */}
          {totalSelected > 0 && (
            <div className="sticky bottom-4 bg-white border border-red-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{totalSelected}</span> {t('admin.itemsSelected')}
                </div>
                <Button
                  onClick={() => setShowConfirmModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('admin.archiveSelected')}
                </Button>
              </div>
            </div>
          )}

          {/* Re-scan button */}
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin', 'pilot-cleanup-scan'] });
            }}
            className="mt-4"
          >
            <Search className="w-4 h-4 mr-2" />
            {t('admin.scanTestData')}
          </Button>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-3">{t('admin.archiveConfirmTitle')}</h3>
            <p className="text-sm text-gray-700 mb-4">{t('admin.archiveConfirmMessage')}</p>
            <div className="mb-4">
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('admin.typeDeleteToConfirm')}
                className="border-red-300 focus:border-red-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmText('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleArchive}
                disabled={confirmText !== 'DELETE' || archiveMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {archiveMutation.isPending ? t('admin.archiving') : t('admin.archiveButton')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reusable Category Section ───

interface CategorySectionProps {
  lang: string;
  title: string;
  items: TestItem[];
  selected: Set<number>;
  setSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleItem: (set: Set<number>, setFn: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => void;
  selectAll: (items: TestItem[], setFn: React.Dispatch<React.SetStateAction<Set<number>>>) => void;
  deselectAll: (setFn: React.Dispatch<React.SetStateAction<Set<number>>>) => void;
  renderRow: (item: TestItem) => React.ReactNode;
}

function CategorySection({ lang, title, items, selected, setSelected, toggleItem, selectAll, deselectAll, renderRow }: CategorySectionProps) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" data-lang={lang}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <h4 className="font-medium text-gray-800 text-sm">
          {title} ({items.length})
        </h4>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => (allSelected ? deselectAll(setSelected) : selectAll(items, setSelected))}
            className="text-xs h-7"
          >
            {allSelected ? t('admin.deselectAll') : t('admin.selectAll')}
          </Button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
              selected.has(item.id) ? 'bg-red-50' : ''
            }`}
            onClick={() => toggleItem(selected, setSelected, item.id)}
          >
            <div className="shrink-0">
              {selected.has(item.id) ? (
                <CheckSquare className="w-4 h-4 text-red-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-sm">{renderRow(item)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}