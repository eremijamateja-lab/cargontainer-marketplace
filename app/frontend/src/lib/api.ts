import { createClient } from '@metagptx/web-sdk';

// Create client instance. Production (Loopia) builds set VITE_API_ORIGIN to the Render backend;
// without it the client stays same-origin ('/'), i.e. the Vite /api proxy in local dev.
const apiOrigin = import.meta.env.VITE_API_ORIGIN as string | undefined;

// Supabase mode: a person in several companies works for one at a time (company switcher in the
// user menu). The choice is sent on every request; switching reloads the page so all data and
// this header change together.
export const ACTIVE_COMPANY_KEY = 'mp_active_company';
export function getActiveCompany(): string {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY) || '';
  } catch {
    return '';
  }
}
export function switchActiveCompany(id: string) {
  try {
    localStorage.setItem(ACTIVE_COMPANY_KEY, id);
  } catch {
    /* ignore */
  }
  window.location.href = '/dashboard';
}

const activeCompany = getActiveCompany();
export const client = createClient({
  ...(apiOrigin ? { baseURL: apiOrigin } : {}),
  ...(activeCompany ? { headers: { 'X-Company-Id': activeCompany } } : {}),
});
