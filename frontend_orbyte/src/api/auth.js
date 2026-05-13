const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function login(email, password) {
  const res = await fetch(`${API_URL}/api/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.non_field_errors?.[0] || 'Credenciales inválidas.')
  return data
}

export async function logout(token) {
  await fetch(`${API_URL}/api/logout/`, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
  })
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}
