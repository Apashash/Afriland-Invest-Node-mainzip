export function setCookie(name, value, days) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

export const REF_COOKIE = 'giftal_ref';
export const LEGACY_REF_COOKIE = 'afriland_ref';

export function getRefCode() {
  return getCookie(REF_COOKIE) || getCookie(LEGACY_REF_COOKIE);
}
