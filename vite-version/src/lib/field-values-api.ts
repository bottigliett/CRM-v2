const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface FieldValue {
  name: string
  count: number
}

function getAuthHeader() {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Non autenticato');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function getFieldValues(table: string, field: string): Promise<FieldValue[]> {
  const res = await fetch(`${API_BASE_URL}/field-values/${table}/${field}`, { headers: getAuthHeader() });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Errore'); }
  const json = await res.json();
  return json.data;
}

export async function renameFieldValue(table: string, field: string, oldName: string, newName: string) {
  const res = await fetch(`${API_BASE_URL}/field-values/${table}/${field}/rename`, {
    method: 'PUT', headers: getAuthHeader(), body: JSON.stringify({ oldName, newName }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Errore'); }
  return res.json();
}
