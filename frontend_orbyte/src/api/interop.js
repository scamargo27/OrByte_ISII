const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${localStorage.getItem('token')}`,
  }
}

export async function exportarPedidos(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString()
  const res = await fetch(`${API_URL}/api/interop/exportar/?${qs}`, { headers: headers() })
  if (!res.ok) throw new Error('Error al exportar.')
  return res.json()
}

export async function importarPedidos(data) {
  const res = await fetch(`${API_URL}/api/interop/importar/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json
}

export async function getExternos(sistema = '') {
  const qs = sistema ? `?sistema=${encodeURIComponent(sistema)}` : ''
  const res = await fetch(`${API_URL}/api/interop/externos/${qs}`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar importaciones.')
  return res.json()
}

export async function eliminarImportacion(id) {
  const res = await fetch(`${API_URL}/api/interop/externos/${id}/`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error('Error al eliminar.')
}
