import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getGraficoFiltros, getProductosMasVendidos } from '../api/pedidos'
import './InformesGraficos.css'

const MESES = [
  { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' },    { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' },  { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' },
]

const BAR_COLOR = '#3b82f6'
const BAR_HOVER = '#1d4ed8'

function formatPrecio(val) {
  return `$${Number(val).toLocaleString('es-CO')}`
}

function labelPeriodo(anio, mes) {
  if (!anio) return 'Todos los datos'
  if (!mes) return `Año ${anio}`
  return `${MESES.find(m => m.id === Number(mes))?.nombre} ${anio}`
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="ig-tooltip">
      <p className="ig-tooltip-nombre">{d.nombre}</p>
      <p className="ig-tooltip-cat">{d.categoria} · {d.marca}</p>
      <p className="ig-tooltip-stat"><span>Unidades vendidas</span><strong>{d.total_vendido}</strong></p>
      <p className="ig-tooltip-stat"><span>Ingresos</span><strong>{formatPrecio(d.ingresos_totales)}</strong></p>
    </div>
  )
}

export default function InformesGraficos() {
  const [filtros, setFiltros]       = useState({ anios: [], categorias: [], marcas: [] })
  const [anio, setAnio]             = useState('')
  const [mes, setMes]               = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [marcaId, setMarcaId]       = useState('')
  const [datos, setDatos]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  useEffect(() => {
    getGraficoFiltros().then(setFiltros).catch(() => {})
  }, [])

  useEffect(() => {
    if (mes && !anio) return
    cargarDatos()
  }, [anio, mes, categoriaId, marcaId])

  async function cargarDatos() {
    setLoading(true)
    setError(null)
    try {
      const result = await getProductosMasVendidos({
        anio: anio || undefined,
        mes: mes || undefined,
        categoria_id: categoriaId || undefined,
        marca_id: marcaId || undefined,
      })
      setDatos(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAnioChange(val) {
    setAnio(val)
    if (!val) setMes('')
  }

  const productos = datos?.productos ?? []
  const resumen   = datos?.resumen ?? {}

  return (
    <div className="ig-root">
      {/* Filtros */}
      <div className="ig-card">
        <div className="ig-card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Filtros de análisis</span>
        </div>

        <div className="ig-filters">
          <div className="ig-filter-field">
            <label>Año</label>
            <select value={anio} onChange={e => handleAnioChange(e.target.value)}>
              <option value="">Todos los años</option>
              {filtros.anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="ig-filter-field">
            <label>Mes</label>
            <select value={mes} onChange={e => setMes(e.target.value)} disabled={!anio}>
              <option value="">Todos los meses</option>
              {MESES.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          <div className="ig-filter-field">
            <label>Categoría</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Todas las categorías</option>
              {filtros.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="ig-filter-field">
            <label>Marca</label>
            <select value={marcaId} onChange={e => setMarcaId(e.target.value)}>
              <option value="">Todas las marcas</option>
              {filtros.marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="ig-periodo">
          <span className="ig-periodo-label">Período activo:</span>
          <span className="ig-periodo-badge">{labelPeriodo(anio, mes)}</span>
          {resumen.total_pedidos > 0 && (
            <span className="ig-periodo-count">({resumen.total_pedidos} pedidos · {resumen.total_unidades} unidades)</span>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="ig-card">
        <div className="ig-card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <span>Productos más vendidos — Rendimiento</span>
          {resumen.total_ingresos > 0 && (
            <span className="ig-ingresos-badge">{formatPrecio(resumen.total_ingresos)} en ingresos</span>
          )}
        </div>

        {loading && <p className="ig-estado">Cargando datos...</p>}
        {error   && <p className="ig-estado ig-error">{error}</p>}

        {!loading && !error && productos.length === 0 && (
          <p className="ig-estado">No hay pedidos completados para el período seleccionado.</p>
        )}

        {!loading && !error && productos.length > 0 && (
          <div className="ig-chart-wrap">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={productos}
                margin={{ top: 10, right: 20, left: 10, bottom: 80 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="nombre"
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: 'Unidades vendidas',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    style: { fontSize: 11, fill: '#9ca3af' },
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar
                  dataKey="total_vendido"
                  radius={[4, 4, 0, 0]}
                  onMouseEnter={(_, idx) => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {productos.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={hoveredBar === idx ? BAR_HOVER : BAR_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabla resumen */}
      {!loading && productos.length > 0 && (
        <div className="ig-card">
          <div className="ig-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Detalle por producto</span>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Unidades</th>
                  <th>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={p.producto_id}>
                    <td className="ig-td-rank">{i + 1}</td>
                    <td className="ig-td-nombre">{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td>{p.marca}</td>
                    <td className="ig-td-num">{p.total_vendido}</td>
                    <td className="ig-td-num">{formatPrecio(p.ingresos_totales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
