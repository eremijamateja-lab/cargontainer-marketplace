import { t } from '@/lib/i18n';

/**
 * Role normalization map: maps various raw role strings to canonical internal keys.
 */
const ROLE_NORMALIZATION: Record<string, string> = {
  // Canonical keys
  freight_forwarder: 'freight_forwarder',
  carrier: 'carrier',
  container_operator: 'container_operator',
  customs_agent: 'customs_agent',
  intermodal_rail: 'intermodal_rail',
  shipping_line: 'shipping_line',
  terminal_depot: 'terminal_depot',
  warehouse_logistics: 'warehouse_logistics',
  // Legacy / alternative keys — freight forwarder variants
  forwarder: 'freight_forwarder',
  freight: 'freight_forwarder',
  spediter: 'freight_forwarder',
  'špediter': 'freight_forwarder',
  // Carrier / transporter variants
  trucking: 'carrier',
  transport: 'carrier',
  transporter: 'carrier',
  // Customs agent variants
  customs: 'customs_agent',
  customs_broker: 'customs_agent',
  t1_agent: 'customs_agent',
  customs_t1: 'customs_agent',
  // Other variants
  rail_operator: 'intermodal_rail',
  rail: 'intermodal_rail',
  intermodal: 'intermodal_rail',
  nvocc: 'shipping_line',
  terminal: 'terminal_depot',
  warehouse_operator: 'warehouse_logistics',
  warehouse: 'warehouse_logistics',
};

/**
 * Safely converts company_roles to a normalized string array of canonical role keys.
 * Handles: array, JSON string, comma-separated string, null, undefined, unexpected types.
 * Returns deduplicated canonical role keys.
 */
export const parseCompanyRoles = (roles: unknown): string[] => {
  let rawArr: string[] = [];

  if (Array.isArray(roles)) {
    rawArr = roles.filter((r) => typeof r === 'string' && r.trim());
  } else if (typeof roles === 'string') {
    const trimmed = roles.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        rawArr = parsed.filter((r: unknown) => typeof r === 'string' && (r as string).trim());
      } else {
        rawArr = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      rawArr = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // Normalize to canonical keys and deduplicate
  const normalized = rawArr.map((r) => ROLE_NORMALIZATION[r.toLowerCase()] || r);
  return [...new Set(normalized)];
};

/**
 * Safely formats company_roles for display using professional i18n labels.
 * Handles: array, JSON string, comma-separated string, null, undefined, unexpected types.
 */
export const formatCompanyRoles = (roles: unknown): string => {
  const parsed = parseCompanyRoles(roles);
  if (parsed.length === 0) return '—';
  return parsed.map((r) => t(`companyRole.${r}`)).join(', ');
};

/**
 * Check if a company has a specific canonical role (or any of the provided roles).
 * Useful for permission checks on marketplace buttons.
 */
export const hasCompanyRole = (roles: unknown, ...targetRoles: string[]): boolean => {
  const parsed = parseCompanyRoles(roles);
  return targetRoles.some((target) => parsed.includes(target));
};

/**
 * Check if the company is ONLY a forwarder (no other roles).
 */
export const isOnlyForwarder = (roles: unknown): boolean => {
  const parsed = parseCompanyRoles(roles);
  return parsed.length > 0 && parsed.every((r) => r === 'freight_forwarder');
};