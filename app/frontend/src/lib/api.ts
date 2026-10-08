import { createClient } from '@metagptx/web-sdk';

// Create client instance. Production (Loopia) builds set VITE_API_ORIGIN to the Render backend;
// without it the client stays same-origin ('/'), i.e. the Vite /api proxy in local dev.
const apiOrigin = import.meta.env.VITE_API_ORIGIN as string | undefined;
export const client = createClient(apiOrigin ? { baseURL: apiOrigin } : undefined);
