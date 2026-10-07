import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

const MARKETPLACE_VISIBLE_STATUSES = new Set(['open', 'published', 'offers_received', 'active']);
const isMarketplaceVisibleRequest = (request: any) => {
  const status = String(request?.status || 'published').toLowerCase();
  return MARKETPLACE_VISIBLE_STATUSES.has(status);
};

// ─── Forwarder's own requests ───
export function useMyRequests(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myRequests,
    queryFn: async () => {
      const res = await client.entities.transport_requests.query({
        query: {},
        sort: '-id',
        limit: 50,
      });
      return res?.data?.items || [];
    },
    enabled,
    staleTime: 30_000,
  });
}

// ─── Marketplace requests (all published/open) ───
export function useMarketplaceRequests(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.marketplaceRequests,
    queryFn: async () => {
      try {
        const res = await client.apiCall.invoke({
          url: '/api/v1/marketplace/requests?skip=0&limit=50',
          method: 'GET',
        });
        return (res?.data?.items || []).filter(isMarketplaceVisibleRequest);
      } catch {
        const fallbackRes = await client.apiCall.invoke({
          url: '/api/v1/entities/transport_requests/all?skip=0&limit=50',
          method: 'GET',
        });
        return (fallbackRes?.data?.items || []).filter(isMarketplaceVisibleRequest);
      }
    },
    enabled,
    staleTime: 30_000,
  });
}

// ─── Offers for a specific request (forwarder view) ───
export function useOffersForRequest(requestId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.offersForRequest(requestId || ''),
    queryFn: async () => {
      if (!requestId) return [];
      const res: any = await client.apiCall.invoke({
        url: `/api/v1/marketplace/offers?request_id=${encodeURIComponent(requestId)}`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (data?.items) return data.items;
      return [];
    },
    enabled: enabled && !!requestId,
    staleTime: 10_000,
    refetchOnMount: 'always',
  });
}

// ─── Single request info ───
export function useRequestInfo(requestId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.requestInfo(requestId || ''),
    queryFn: async () => {
      if (!requestId) return null;
      const res = await client.entities.transport_requests.get({ id: requestId });
      return res?.data || null;
    },
    enabled: enabled && !!requestId,
    staleTime: 60_000,
  });
}

// ─── Carrier's own offers ───
export function useMyOffers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myOffers,
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({
        url: '/api/v1/marketplace/my-offers?skip=0&limit=50',
        method: 'GET',
      });
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (data?.items) return data.items;
      return [];
    },
    enabled,
    staleTime: 10_000,
    refetchOnMount: 'always',
  });
}

// ─── My shipments (unified for both forwarder and carrier) ───
export function useMyShipments(enabled: boolean) {
  return useQuery({
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
    enabled,
    staleTime: 20_000,
    retry: 2,
  });
}

// ─── MUTATIONS ───

// Create transport request
export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return client.entities.transport_requests.create({ data: payload });
    },
    onSuccess: () => {
      toast.success('Transport request created!');
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      qc.invalidateQueries({ queryKey: queryKeys.marketplaceRequests });
      // Only invalidate dashboard stats, not a full refetch cascade
      qc.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to create request: ${detail}`);
    },
  });
}

// Update transport request (forwarder edits own request)
export function useUpdateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return client.entities.transport_requests.update({
        id: String(id),
        data,
      });
    },
    onSuccess: () => {
      toast.success('Request updated!');
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      qc.invalidateQueries({ queryKey: queryKeys.marketplaceRequests });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to update request: ${detail}`);
    },
  });
}

// Delete transport request
export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return client.entities.transport_requests.delete({ id: String(id) });
    },
    onSuccess: () => {
      toast.success('Request deleted');
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      qc.invalidateQueries({ queryKey: queryKeys.marketplaceRequests });
      qc.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: () => {
      toast.error('Failed to delete request');
    },
  });
}

// Submit offer (carrier or customs agent)
export function useSubmitOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      // Ensure defaults for required fields
      const data = {
        status: 'pending',
        service_type: 'transport',
        ...payload,
      };

      const res: any = await client.apiCall.invoke({
        url: '/api/v1/entities/offers',
        method: 'POST',
        data,
      });

      // Validate that the backend actually created the offer
      const responseData = res?.data || res;
      if (!responseData?.id) {
        // Backend did not return a valid offer — treat as failure
        const errorDetail = responseData?.detail || 'Offer was not saved. Please try again.';
        throw new Error(errorDetail);
      }

      // Auto-update request status to 'offers_received' after confirmed offer creation
      if (data.request_id) {
        try {
          await client.entities.transport_requests.update({
            id: String(data.request_id),
            data: { status: 'offers_received' },
          });
        } catch {
          // Non-critical — don't fail the offer submission
        }
      }

      return responseData;
    },
    onSuccess: (_data, variables) => {
      toast.success('Offer submitted successfully!');
      qc.invalidateQueries({ queryKey: queryKeys.myOffers });
      qc.invalidateQueries({ queryKey: queryKeys.marketplaceRequests });
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      // Invalidate all offers-for-request queries (prefix match)
      qc.invalidateQueries({ queryKey: ['offers-for-request'] });
      // Also invalidate the specific request's offers query
      if (variables?.request_id) {
        qc.invalidateQueries({
          queryKey: queryKeys.offersForRequest(String(variables.request_id)),
        });
      }
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to submit offer: ${detail}`);
    },
  });
}

// Accept offer (forwarder)
export function useAcceptOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { offer_id: number; request_id: number }) => {
      return client.apiCall.invoke({
        url: '/api/v1/marketplace/accept-offer',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast.success('Offer accepted! Shipment created.');
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      qc.invalidateQueries({ queryKey: queryKeys.myShipments });
      qc.invalidateQueries({ queryKey: ['offers-for-request'] });
      qc.invalidateQueries({ queryKey: ['dashboard-data'] });
      qc.invalidateQueries({ queryKey: queryKeys.receivedOffers });
    },
    onError: () => {
      toast.error('Failed to accept offer');
    },
  });
}

// Reject offer (forwarder/RFQ owner)
export function useRejectOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { offer_id: number; request_id: number }) => {
      return client.apiCall.invoke({
        url: '/api/v1/marketplace/reject-offer',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast.success('Offer rejected.');
      qc.invalidateQueries({ queryKey: queryKeys.myRequests });
      qc.invalidateQueries({ queryKey: queryKeys.myShipments });
      qc.invalidateQueries({ queryKey: ['offers-for-request'] });
      qc.invalidateQueries({ queryKey: ['dashboard-data'] });
      qc.invalidateQueries({ queryKey: queryKeys.receivedOffers });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to reject offer: ${detail}`);
    },
  });
}

// Get received offers (forwarder — offers on their RFQs)
export function useReceivedOffers(enabled: boolean, statusFilter?: string) {
  return useQuery({
    queryKey: [...queryKeys.receivedOffers, statusFilter || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status_filter', statusFilter);
      params.set('limit', '50');
      const res = await client.apiCall.invoke({
        url: `/api/v1/marketplace/received-offers?${params.toString()}`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled,
    staleTime: 10_000,
    refetchOnMount: 'always' as const,
  });
}

// Update tracking link (carrier)
export function useUpdateTrackingLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { request_id: number; tracking_link: string }) => {
      return client.apiCall.invoke({
        url: '/api/v1/marketplace/update-tracking-link',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast.success('Tracking link updated!');
      // Only invalidate shipments — tracking link doesn't affect dashboard stats
      qc.invalidateQueries({ queryKey: queryKeys.myShipments });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to update tracking link: ${detail}`);
    },
  });
}

// Update shipment details (role-based: carrier edits driver/vehicle, forwarder edits instructions)
export function useUpdateDriverDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      shipment_id: number;
      driver_name?: string;
      driver_phone?: string;
      vehicle_plate?: string;
      trailer_plate?: string;
      container_number?: string;
      carrier_email?: string;
      carrier_phone?: string;
      operational_notes?: string;
      forwarder_notes?: string;
    }) => {
      return client.apiCall.invoke({
        url: '/api/v1/marketplace/update-driver-details',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      toast.success('Details saved!');
      qc.invalidateQueries({ queryKey: queryKeys.myShipments });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to save: ${detail}`);
    },
  });
}

// ─── COMPANY QUERIES ───

export function useMyCompany(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myCompany,
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/company/my-company',
        method: 'GET',
      });
      return res?.data || null;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCompanyMembers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.companyMembers,
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/company/members',
        method: 'GET',
      });
      return res?.data?.members || [];
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCompanyDirectory(
  params: { search?: string; company_type?: string; country?: string; skip?: number; limit?: number },
  enabled: boolean
) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.company_type) qs.set('company_type', params.company_type);
  if (params.country) qs.set('country', params.country);
  qs.set('skip', String(params.skip || 0));
  qs.set('limit', String(params.limit || 20));
  const key = qs.toString();

  return useQuery({
    queryKey: queryKeys.companyDirectory(key),
    queryFn: async () => {
      console.log(`[useCompanyDirectory] Fetching: /api/v1/company/directory?${key}`);
      try {
        const res = await client.apiCall.invoke({
          url: `/api/v1/company/directory?${key}`,
          method: 'GET',
        });
        const data = res?.data || { items: [], total: 0 };
        console.log(`[useCompanyDirectory] Success: ${data.total} companies returned`);
        return data;
      } catch (err) {
        console.error('[useCompanyDirectory] Error fetching directory:', err);
        // Return empty result instead of throwing to avoid breaking the UI
        return { items: [], total: 0 };
      }
    },
    enabled,
    staleTime: 10_000, // Reduced stale time to ensure fresh data
    retry: 2, // Retry up to 2 times on failure
  });
}

export function useCompanyPublic(companyId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.companyPublic(companyId || 0),
    queryFn: async () => {
      if (!companyId) return null;
      const res = await client.apiCall.invoke({
        url: `/api/v1/company/${companyId}`,
        method: 'GET',
      });
      return res?.data || null;
    },
    enabled: enabled && !!companyId,
    staleTime: 60_000,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return client.apiCall.invoke({
        url: '/api/v1/company/create',
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      toast.success('Company created!');
      qc.invalidateQueries({ queryKey: queryKeys.myCompany });
      qc.invalidateQueries({ queryKey: queryKeys.companyMembers });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to create company: ${detail}`);
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return client.apiCall.invoke({
        url: '/api/v1/company/update',
        method: 'PUT',
        data: payload,
      });
    },
    onSuccess: () => {
      toast.success('Company updated!');
      qc.invalidateQueries({ queryKey: queryKeys.myCompany });
      qc.invalidateQueries({ queryKey: queryKeys.companyMembers });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to update company: ${detail}`);
    },
  });
}

// Invite member to company
export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; member_role: string }) => {
      return client.apiCall.invoke({
        url: '/api/v1/company/invite',
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      toast.success(t('company.memberAddedSuccess'));
      qc.invalidateQueries({ queryKey: queryKeys.companyMembers });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to add member: ${detail}`);
    },
  });
}

// Remove member from company
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (member_user_id: string) => {
      return client.apiCall.invoke({
        url: '/api/v1/company/remove-member',
        method: 'POST',
        data: { member_user_id },
      });
    },
    onSuccess: () => {
      toast.success('Member removed');
      qc.invalidateQueries({ queryKey: queryKeys.companyMembers });
      qc.invalidateQueries({ queryKey: queryKeys.myCompany });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to remove member: ${detail}`);
    },
  });
}

// Join a company (accept invite)
export function useJoinCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { company_id: number; member_role?: string }) => {
      return client.apiCall.invoke({
        url: '/api/v1/company/join',
        method: 'POST',
        data: payload,
      });
    },
    onSuccess: () => {
      toast.success('Joined company!');
      qc.invalidateQueries({ queryKey: queryKeys.myCompany });
      qc.invalidateQueries({ queryKey: queryKeys.companyMembers });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to join company: ${detail}`);
    },
  });
}

// Update shipment status (carrier milestone progression) — with optimistic update
export function useUpdateShipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      shipment_id: number;
      status: string;
      current_location?: string;
      vehicle_plate?: string;
      container_number?: string;
    }) => {
      return client.apiCall.invoke({
        url: '/api/v1/marketplace/update-shipment-status',
        method: 'POST',
        data,
      });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: queryKeys.myShipments });

      // Snapshot previous value
      const previousShipments = qc.getQueryData(queryKeys.myShipments);

      // Optimistically update the shipment status in cache
      qc.setQueryData(queryKeys.myShipments, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((s: any) =>
          s.id === variables.shipment_id
            ? {
                ...s,
                status: variables.status,
                vehicle_plate: variables.vehicle_plate || s.vehicle_plate,
                container_number: variables.container_number || s.container_number,
                current_location: variables.current_location || s.current_location,
                updated_at: new Date().toISOString(),
              }
            : s
        );
      });

      return { previousShipments };
    },
    onSuccess: (_data, variables) => {
      const labels: Record<string, string> = {
        picked_up: 'Marked as Picked Up',
        in_transit: 'Shipment is In Transit',
        border_exit: 'Passed Border Exit',
        customs: 'At Customs',
        delivered: 'Shipment Delivered!',
      };
      toast.success(labels[variables.status] || 'Status updated!');
      // Refetch to ensure server state is in sync
      qc.invalidateQueries({ queryKey: queryKeys.myShipments });
      // Only invalidate dashboard if delivered (stat change)
      if (variables.status === 'delivered') {
        qc.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    },
    onError: (err: any, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousShipments) {
        qc.setQueryData(queryKeys.myShipments, context.previousShipments);
      }
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      toast.error(`Failed to update status: ${detail}`);
    },
  });
}

// ─── Chat messages for one offer's negotiation thread ───
export function useOfferMessages(offerId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.offerMessages(offerId || ''),
    queryFn: async () => {
      if (!offerId) return [];
      const res: any = await client.apiCall.invoke({
        url: `/api/v1/marketplace/offers/${offerId}/messages`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && !!offerId,
    // Simple polling — good enough for a first version, swap for
    // WebSocket/Realtime later if instant delivery is needed.
    refetchInterval: enabled ? 4000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useSendOfferMessage(offerId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!offerId) throw new Error('Missing offer id');
      return client.apiCall.invoke({
        url: `/api/v1/marketplace/offers/${offerId}/messages`,
        method: 'POST',
        data: { body },
      });
    },
    onSuccess: () => {
      if (offerId) qc.invalidateQueries({ queryKey: queryKeys.offerMessages(offerId) });
      qc.invalidateQueries({ queryKey: queryKeys.unreadMessages });
      qc.invalidateQueries({ queryKey: queryKeys.myThreads });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

// ─── Unified inbox — every thread (offer or pre-offer) the user is part of ───
export function useMyThreads(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.myThreads,
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({
        url: '/api/v1/marketplace/messages/threads',
        method: 'GET',
      });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled,
    refetchInterval: enabled ? 6000 : false,
    refetchOnWindowFocus: true,
  });
}

// ─── Unread chat message count (nav badge) ───
export function useUnreadMessageCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.unreadMessages,
    queryFn: async () => {
      const res: any = await client.apiCall.invoke({
        url: '/api/v1/marketplace/offers/messages/unread-count',
        method: 'GET',
      });
      const data = res?.data ?? res;
      return data?.unread_count || 0;
    },
    enabled,
    refetchInterval: enabled ? 15_000 : false,
    staleTime: 10_000,
  });
}

// ─── Platform-admin pending approvals count (companies + team members), nav badge ───
export function useAdminPendingCount(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'pending-count'],
    queryFn: async () => {
      const res = await client.apiCall.invoke({
        url: '/api/v1/admin/pending-count',
        method: 'GET',
      });
      const data = res?.data ?? res;
      return data?.total || 0;
    },
    enabled,
    refetchInterval: enabled ? 20_000 : false,
    staleTime: 15_000,
  });
}

// ─── Chat messages for a pre-offer inquiry thread (request + carrier) ───
export function useRequestMessages(requestId: number | null, carrierUserId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.requestMessages(requestId || '', carrierUserId || undefined),
    queryFn: async () => {
      if (!requestId) return [];
      const res: any = await client.apiCall.invoke({
        url: `/api/v1/marketplace/requests/${requestId}/messages${carrierUserId ? `?carrier_user_id=${encodeURIComponent(carrierUserId)}` : ''}`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && !!requestId,
    refetchInterval: enabled ? 4000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useSendRequestMessage(requestId: number | null, carrierUserId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!requestId) throw new Error('Missing request id');
      return client.apiCall.invoke({
        url: `/api/v1/marketplace/requests/${requestId}/messages${carrierUserId ? `?carrier_user_id=${encodeURIComponent(carrierUserId)}` : ''}`,
        method: 'POST',
        data: { body },
      });
    },
    onSuccess: () => {
      if (requestId) {
        qc.invalidateQueries({ queryKey: queryKeys.requestMessages(requestId, carrierUserId || undefined) });
        qc.invalidateQueries({ queryKey: queryKeys.requestThreads(requestId) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.unreadMessages });
      qc.invalidateQueries({ queryKey: queryKeys.myThreads });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

// ─── List of carrier inquiry threads on one of the forwarder's own requests ───
export function useRequestThreads(requestId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.requestThreads(requestId || ''),
    queryFn: async () => {
      if (!requestId) return [];
      const res: any = await client.apiCall.invoke({
        url: `/api/v1/marketplace/requests/${requestId}/messages/threads`,
        method: 'GET',
      });
      const data = res?.data ?? res;
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled && !!requestId,
    refetchInterval: enabled ? 6000 : false,
  });
}