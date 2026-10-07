/**
 * Shared constants for transport types, additional services, and European countries
 * used across Requests, Marketplace, and Shipments pages.
 */

// ─── Main Transport Categories (single select) ───
export const TRANSPORT_TYPES = [
  { value: 'container', label: 'Container', emoji: '📦' },
  { value: 'truck_van', label: 'Truck / Van', emoji: '🚛' },
  { value: 'rail', label: 'Rail / Intermodal', emoji: '🚂' },
  { value: 'oversized', label: 'Oversized / Special Cargo', emoji: '⚠️' },
  { value: 'customs_only', label: 'Customs Only', emoji: '🛃' },
] as const;

export const TRANSPORT_TYPE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  container: { label: 'Container', emoji: '📦', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  truck_van: { label: 'Truck / Van', emoji: '🚛', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  rail: { label: 'Rail', emoji: '🚂', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  oversized: { label: 'Oversized', emoji: '⚠️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  customs_only: { label: 'Customs Only', emoji: '🛃', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  // Legacy mappings for backward compatibility with existing data
  ftl: { label: 'Truck / Van', emoji: '🚛', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ltl: { label: 'Truck / Van', emoji: '🚛', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  reefer: { label: 'Container', emoji: '📦', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  customs_t1: { label: 'Customs / T1', emoji: '🛃', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// Backward compat alias — pages that still import CATEGORY_MAP will work
export const CATEGORY_MAP = TRANSPORT_TYPE_MAP;

// Legacy alias so existing imports don't break
export const TRANSPORT_CATEGORIES = TRANSPORT_TYPES;

// ─── Transport Mode (FTL/LTL) — applies to Truck/Van category ───
export const TRANSPORT_MODES = [
  { value: 'ftl', label: 'FTL (Full Truck Load)', emoji: '🚛' },
  { value: 'ltl', label: 'LTL (Less Than Truck Load)', emoji: '📦' },
] as const;

export const TRANSPORT_MODE_MAP: Record<string, { label: string; shortLabel: string; color: string }> = {
  ftl: { label: 'FTL (Full Truck Load)', shortLabel: 'FTL', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ltl: { label: 'LTL (Less Than Truck Load)', shortLabel: 'LTL', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// ─── Vehicle Types — applies to Truck/Van category ───
export const VEHICLE_TYPES = [
  { value: 'van_3_5t', label: 'Van up to 3.5t' },
  { value: 'truck_7_5t', label: 'Truck up to 7.5t' },
  { value: 'truck_12t', label: 'Truck up to 12t' },
  { value: 'trailer_truck', label: 'Trailer Truck' },
  { value: 'semi_trailer', label: 'Semi-trailer' },
] as const;

export const VEHICLE_TYPE_MAP: Record<string, string> = {
  van_3_5t: 'Van up to 3.5t',
  truck_7_5t: 'Truck up to 7.5t',
  truck_12t: 'Truck up to 12t',
  trailer_truck: 'Trailer Truck',
  semi_trailer: 'Semi-trailer',
};

// ─── Customs Service Types — for Customs Only requests ───
export const CUSTOMS_SERVICE_TYPES = [
  { value: 'customs_clearance', label: 'Customs Clearance' },
  { value: 't1_transit', label: 'T1 Transit Document' },
  { value: 'customs_documentation', label: 'Customs Documentation' },
  { value: 'customs_brokerage', label: 'Customs Brokerage' },
] as const;

export const CUSTOMS_SERVICE_MAP: Record<string, string> = {
  customs_clearance: 'Customs Clearance',
  t1_transit: 'T1 Transit',
  customs_documentation: 'Documentation',
  customs_brokerage: 'Brokerage',
};

// ─── Additional Services (multi-select checkboxes) ───
export const ADDITIONAL_SERVICES = [
  { value: 'customs_t1', label: 'Customs / T1', emoji: '🛃' },
] as const;

export const SERVICE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  customs_t1: { label: 'Customs / T1', emoji: '🛃', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// Helper to parse comma-separated additional_services string
export function parseServices(services: string | null | undefined): string[] {
  if (!services) return [];
  return services.split(',').map((s) => s.trim()).filter(Boolean);
}

// Helper to serialize services array to comma-separated string
export function serializeServices(services: string[]): string {
  return services.filter(Boolean).join(',');
}

// European countries relevant to Balkans/Central Europe logistics
export const COUNTRIES = [
  { code: 'RS', name: 'Serbia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BA', name: 'Bosnia & Herzegovina' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'AL', name: 'Albania' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AT', name: 'Austria' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'PL', name: 'Poland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'MD', name: 'Moldova' },
  { code: 'CN', name: 'China' },
] as const;

export const COUNTRY_MAP: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.name])
);

// Flag emoji helper
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const codePoints = [...code.toUpperCase()].map(
    (c) => 0x1f1e6 + c.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

export const CONTAINER_TYPES = [
  { value: '20DV', label: "20DV (20' Dry Van)" },
  { value: '40DV', label: "40DV (40' Dry Van)" },
  { value: '40HC', label: "40HC (40' High Cube)" },
  { value: '45HC', label: "45HC (45' High Cube)" },
  { value: '20OT', label: "20OT (Open Top)" },
  { value: '40OT', label: "40OT (Open Top)" },
  { value: '20FR', label: "20FR (Flat Rack)" },
  { value: '40FR', label: "40FR (Flat Rack)" },
  { value: 'Reefer', label: 'Reefer (Refrigerated)' },
] as const;

export const CONTAINER_SHORT: Record<string, string> = {
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

// ─── Company Roles (multi-select) ───
export const COMPANY_ROLES = [
  { value: 'freight_forwarder', label: 'Freight Forwarder', emoji: '📦' },
  { value: 'carrier', label: 'Carrier / Transporter', emoji: '🚛' },
  { value: 'container_operator', label: 'Container Transport Operator', emoji: '📦' },
  { value: 'customs_agent', label: 'Customs / T1 Agent', emoji: '🛃' },
  { value: 'intermodal_rail', label: 'Intermodal / Rail Operator', emoji: '🚂' },
  { value: 'shipping_line', label: 'Shipping Line / NVOCC', emoji: '🚢' },
  { value: 'terminal_depot', label: 'Terminal / Depot', emoji: '🏗️' },
  { value: 'warehouse_logistics', label: 'Warehouse / Logistics Operator', emoji: '🏭' },
] as const;

export const COMPANY_ROLE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  freight_forwarder: { label: 'Freight Forwarder', emoji: '📦', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  carrier: { label: 'Carrier / Transporter', emoji: '🚛', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  container_operator: { label: 'Container Transport Operator', emoji: '📦', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  customs_agent: { label: 'Customs / T1 Agent', emoji: '🛃', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  intermodal_rail: { label: 'Intermodal / Rail Operator', emoji: '🚂', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  shipping_line: { label: 'Shipping Line / NVOCC', emoji: '🚢', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  terminal_depot: { label: 'Terminal / Depot', emoji: '🏗️', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  warehouse_logistics: { label: 'Warehouse / Logistics Operator', emoji: '🏭', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

// Legacy aliases for backward compatibility
export const COMPANY_TYPES = COMPANY_ROLES;
export const COMPANY_TYPE_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  ...COMPANY_ROLE_MAP,
  // Map old single-select values to new roles
  customs_broker: COMPANY_ROLE_MAP.customs_agent,
  terminal: COMPANY_ROLE_MAP.terminal_depot,
  rail_operator: COMPANY_ROLE_MAP.intermodal_rail,
};

// ─── Member Roles ───
export const MEMBER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'driver', label: 'Driver' },
] as const;

// ─── Company Capabilities ───
export const CAPABILITY_TRANSPORT_MODES = [
  { value: 'ftl', label: 'FTL (Full Truck Load)' },
  { value: 'ltl', label: 'LTL (Less Than Truck Load)' },
] as const;

export const CAPABILITY_VEHICLE_TYPES = VEHICLE_TYPES;

export const CAPABILITY_TRANSPORT_CATEGORIES = [
  { value: 'container', label: 'Container Transport' },
  { value: 'truck_van', label: 'Truck / Van Transport' },
  { value: 'rail', label: 'Rail / Intermodal' },
  { value: 'oversized', label: 'Oversized / Special Cargo' },
  { value: 'customs_only', label: 'Customs Services' },
] as const;