/**
 * Centralized React Query key constants.
 * Using a single source of truth makes cross-page cache invalidation reliable.
 */
export const queryKeys = {
  // Transport requests
  myRequests: ['my-requests'] as const,
  marketplaceRequests: ['marketplace-requests'] as const,

  // Offers
  myOffers: ['my-offers'] as const,
  receivedOffers: ['received-offers'] as const,
  offersForRequest: (requestId: string | number) =>
    ['offers-for-request', String(requestId)] as const,
  requestInfo: (requestId: string | number) =>
    ['request-info', String(requestId)] as const,

  // Shipments
  myShipments: ['my-shipments'] as const,

  // Messages (chat, per offer)
  offerMessages: (offerId: string | number) =>
    ['offer-messages', String(offerId)] as const,
  unreadMessages: ['unread-messages'] as const,

  // Messages (pre-offer chat, per request + carrier)
  requestMessages: (requestId: string | number, carrierUserId?: string) =>
    ['request-messages', String(requestId), carrierUserId || ''] as const,
  requestThreads: (requestId: string | number) =>
    ['request-threads', String(requestId)] as const,

  // Unified inbox — every conversation the current user is part of
  myThreads: ['my-threads'] as const,

  // Dashboard stats (role-specific)
  dashboardData: (role: string) => ['dashboard-data', role] as const,

  // Company
  myCompany: ['my-company'] as const,
  companyMembers: ['company-members'] as const,
  companyDirectory: (params: string) => ['company-directory', params] as const,
  companyPublic: (id: number) => ['company-public', id] as const,
} as const;