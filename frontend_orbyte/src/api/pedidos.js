const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function headers() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  }
}

export async function getEstados() {
  const res = await fetch(`${API_URL}/api/pedidos/estados/`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar estados.')
  return res.json()
}

export async function getInforme(params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${API_URL}/api/pedidos/informe/?${qs}`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar pedidos.')
  return res.json()
}

export async function editarPedido(id, estadoId, motivo) {
  const res = await fetch(`${API_URL}/api/pedidos/${id}/editar/`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ estado_id: estadoId, motivo }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.non_field_errors?.[0] || data.error || 'Error al editar.')
  return data
}

export async function getHistorial(pedidoId) {
  const res = await fetch(`${API_URL}/api/pedidos/${pedidoId}/historial/`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar el historial.')
  return res.json()
}

export async function getGraficoFiltros() {
  const res = await fetch(`${API_URL}/api/pedidos/grafico/filtros/`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar filtros.')
  return res.json()
}

export async function getInformeConsolidado() {
  const res = await fetch(`${API_URL}/api/pedidos/consolidado/`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar el informe consolidado.')
  return res.json()
}

export async function getProductos() {
  const res = await fetch(`${API_URL}/api/productos/`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar productos.')
  return res.json()
}

export async function buscarCliente(q) {
  const res = await fetch(
    `${API_URL}/api/clientes/buscar/?q=${encodeURIComponent(q)}`,
    { headers: headers() }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al buscar cliente.')
  return data
}

export async function registrarPedido(clienteId, productos) {
  const res = await fetch(`${API_URL}/api/pedidos/registrar/`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ cliente_id: clienteId, productos }),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg =
      data.non_field_errors?.[0] ||
      data.productos?.[0] ||
      data.error ||
      'Error al registrar el pedido.'
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

export async function getProductosMasVendidos(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
  ).toString()
  const res = await fetch(`${API_URL}/api/pedidos/grafico/productos-mas-vendidos/?${qs}`, { headers: headers() })
  if (!res.ok) throw new Error('Error al cargar datos del gráfico.')
  return res.json()
}
