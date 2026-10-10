// Web Push on this device ("obaveštenja na telefonu/računaru") + the new-request sound.
import { client } from './api';
import { getLanguage } from './i18n';

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone/iPad Safari only allows push from an app added to the Home Screen. */
export const isIosNotInstalled = () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (window.matchMedia?.('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
  return ios && !standalone;
};

function b64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) || navigator.serviceWorker.register('/sw.js');
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/** The browser keeps one push subscription per device, whoever is logged in. Re-register it for
 *  the account + company that is logged in now, so pushes follow the current user (otherwise the
 *  switch shows "on" while the server still sends this device's pushes to the previous account). */
let claimedThisLoad = false;
export async function claimPushForCurrentUser(force = false): Promise<boolean> {
  if ((claimedThisLoad && !force) || !isPushSupported() || Notification.permission !== 'granted') return false;
  const sub = await getPushSubscription();
  if (!sub) return false;
  const json = sub.toJSON();
  await client.apiCall.invoke({
    url: '/api/v1/notifications/push/subscribe',
    method: 'POST',
    data: { endpoint: json.endpoint, keys: json.keys, lang: getLanguage() },
  });
  claimedThisLoad = true;
  return true;
}

export async function enablePush(): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const keyRes: any = await client.apiCall.invoke({ url: '/api/v1/notifications/push/public-key', method: 'GET' });
  const publicKey = (keyRes?.data ?? keyRes)?.public_key;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
  }
  const json = sub.toJSON();
  await client.apiCall.invoke({
    url: '/api/v1/notifications/push/subscribe',
    method: 'POST',
    data: { endpoint: json.endpoint, keys: json.keys, lang: getLanguage() },
  });
  return 'ok';
}

export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await client.apiCall.invoke({ url: '/api/v1/notifications/push/unsubscribe', method: 'POST', data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<{ sent: number; devices: number }> {
  const res: any = await client.apiCall.invoke({ url: '/api/v1/notifications/push/test', method: 'POST' });
  const d = res?.data ?? res;
  return { sent: d?.sent ?? 0, devices: d?.devices ?? 0 };
}

/** Desktop notification from the open board (same tag as the server push, so never shown twice). */
export async function showLocalNotification(title: string, body: string, url: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration('/');
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: '/icon-512.png', data: { url } });
    } else {
      const n = new Notification(title, { body, tag, icon: '/icon-512.png' });
      n.onclick = () => { window.focus(); window.location.href = url; };
    }
  } catch {
    /* ignore */
  }
}

// ─── Sound (generated, no audio file) ───
const SOUND_KEY = 'mp_alert_sound';
export const isSoundOn = () => {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
};
export const setSoundOn = (on: boolean) => {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
};

let audioCtx: AudioContext | null = null;
export function playAlertSound() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1175;
      const t0 = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.17);
    });
  } catch {
    /* ignore */
  }
}
