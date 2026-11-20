const BASE = process.env.API_BASE ?? 'http://localhost:4000'

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  return { status: res.status, ok: json.success, token: json.data?.token, role: json.data?.user?.role_name, reason: json.error }
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.status
}

const CREDENTIALS = [
  ['admin', 'administrador@clubcostaverde.cu'],
  ['hr', 'rrhh@clubcostaverde.cu'],
  ['receptionist', 'recepcion@clubcostaverde.cu'],
  ['director', 'director@socialclub.local'],
  ['user (activo)', 'user1@socialclub.local'],
  ['user (pago pendiente)', 'user2@socialclub.local'],
  ['externo', 'external@socialclub.local'],
]

async function main() {
  const results = []

  for (const [label, email] of CREDENTIALS) {
    const l = await login(email, 'password')
    results.push({ check: `login ${email}`, status: l.status, ok: l.ok, role: l.role, reason: l.reason })
    if (!l.token) continue

    const expectations = []
    if (label === 'admin') {
      expectations.push(['GET /api/admin/users -> 200', await get('/api/admin/users', l.token) === 200])
      expectations.push(['GET /api/admin/reports/dashboard -> 200', await get('/api/admin/reports/dashboard', l.token) === 200])
      expectations.push(['GET /api/employees -> 200', await get('/api/employees', l.token) === 200])
    }
    if (label === 'hr') {
      expectations.push(['GET /api/employees -> 200 (permitido)', await get('/api/employees', l.token) === 200])
      expectations.push(['GET /api/admin/users -> 403 (denegado)', await get('/api/admin/users', l.token) === 403])
    }
    if (label === 'receptionist') {
      expectations.push(['GET /api/reception/today -> 200 (permitido)', await get('/api/reception/today', l.token) === 200])
      expectations.push(['GET /api/admin/users -> 403 (denegado)', await get('/api/admin/users', l.token) === 403])
    }
    if (label === 'director') {
      expectations.push(['GET /api/admin/reports/dashboard -> 200 (permitido)', await get('/api/admin/reports/dashboard', l.token) === 200])
      expectations.push(['GET /api/admin/users -> 403 (denegado)', await get('/api/admin/users', l.token) === 403])
    }
    if (label.startsWith('user (activo)')) {
      expectations.push(['GET /api/reservations -> 200', await get('/api/reservations', l.token) === 200])
      expectations.push(['GET /api/admin/users -> 403 (denegado)', await get('/api/admin/users', l.token) === 403])
      expectations.push(['POST /api/activities -> 403 (denegado)', (await fetch(`${BASE}/api/activities`, { method: 'POST', headers: { Authorization: `Bearer ${l.token}`, 'Content-Type': 'application/json' }, body: '{}' })).status === 403])
    }
    if (label.startsWith('user (pago')) {
      expectations.push(['GET /api/reservations -> 200 (acceso con estado pendiente)', await get('/api/reservations', l.token) === 200])
      expectations.push(['POST /api/reservations -> 403 (denegado, sin suscripcion paga)', (await fetch(`${BASE}/api/reservations`, { method: 'POST', headers: { Authorization: `Bearer ${l.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ activity_id: '00000000-0000-0000-0000-000000000000', reservation_date: '2099-01-01', quantity: 1 }) })).status === 403])
    }
    if (label === 'externo') {
      expectations.push(['GET /api/reservations -> 200', await get('/api/reservations', l.token) === 200])
      expectations.push(['GET /api/admin/users -> 403 (denegado)', await get('/api/admin/users', l.token) === 403])
    }

    results.push(...expectations.map(([check, ok]) => ({ check: `[${label}] ${check}`, ok: ok ? 'PASS' : 'FAIL' })))
  }

  for (const r of results) {
    console.log(`${r.status ? `HTTP ${r.status}` : ''} | ${r.role ?? ''} | ${r.ok ? 'OK' : 'KO'} | ${r.reason ?? r.check}  ${r.check ?? ''}`.trim())
  }
}

main().catch((error) => { console.error('Smoke failed:', error); process.exit(1) })