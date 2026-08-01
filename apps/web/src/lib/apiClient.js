const API_BASE = '/api';

export async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(isForm ? {} : options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (response.status === 413) {
    throw new Error('Total foto terlalu besar. Pilih ulang foto agar dikompres sebelum diunggah.');
  }
  if (!response.ok) throw new Error(data.error || `Request gagal (${response.status})`);
  return data;
}

export const imageUrl = (id, thumbnail = false) => (
  id ? `${API_BASE}/images/${encodeURIComponent(id)}${thumbnail ? '?thumb=1' : ''}` : ''
);
