# OrByte

Sistema de gestión de pedidos para tienda de periféricos tecnológicos.

## Estructura del repositorio

```
orbyte/
├── backend_orbyte/    ← API REST (Django + PostgreSQL)
└── frontend_orbyte/   ← Interfaz web (React + Vite)
```

---

## Backend

### Requisitos
- Python 3.11+
- PostgreSQL

### Configuración

```bash
cd backend_orbyte

# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Instalar dependencias
pip install -r requirements.txt
```

### Variables de entorno

Crear un archivo `.env` dentro de `backend_orbyte/` con:

```
DB_NAME=nombre_bd
DB_USER=usuario_bd
DB_PASSWORD=contraseña_bd
DB_HOST=localhost
DB_PORT=5432
```

### Correr el servidor

```bash
python manage.py migrate
python manage.py runserver
```

API disponible en `http://localhost:8000`

### Datos de prueba (opcional)

```bash
python manage.py seed_db
```

Crea roles, estados, marcas, categorías, usuarios y 36 pedidos de ejemplo.

**Credenciales de prueba:**

| Rol | Nombre | Email | Contraseña | Cédula |
|---|---|---|---|---|
| Admin | Carlos Rodríguez | admin@orbyte.com | admin1234 | 1020304050 |
| Vendedor | María García | maria.g@orbyte.com | trab1234 | 1030405060 |
| Vendedor | Luis Fernández | luis.f@orbyte.com | trab1234 | 1040506070 |
| Cliente | Juan Pérez | juan@gmail.com | cliente1234 | 1050607080 |
| Cliente | Ana Martínez | ana@gmail.com | cliente1234 | 1060708090 |
| Cliente | Pedro Soto | pedro@gmail.com | cliente1234 | 1070809100 |
| Cliente | Sofía Vargas | sofia@gmail.com | cliente1234 | 1080910110 |
| Cliente | Andrés Castro | andres@gmail.com | cliente1234 | 1091011120 |

---

## Frontend

### Requisitos
- Node.js 18+

### Configuración

```bash
cd frontend_orbyte
npm install
npm run dev
```

App disponible en `http://localhost:5173`

### Variables de entorno (opcional)

Crear un archivo `.env` dentro de `frontend_orbyte/` para apuntar a una API en otro host o puerto:

```
VITE_API_URL=http://localhost:8000
```

Si no existe el archivo, usa `http://localhost:8000` por defecto.

### Dependencias principales

| Paquete | Versión | Uso |
|---|---|---|
| react | ^19 | Framework UI |
| recharts | ^3 | Gráficos e histogramas |
| vite | ^8 | Bundler / dev server |

---

## Roles y permisos

| Rol | Permisos |
|---|---|
| **Admin** | Acceso completo: registrar pedidos, editar estados, ver todos los informes y gráficos |
| **Vendedor** | Registrar pedidos, editar estados, ver tabla de sus propios pedidos (sin pestañas de informes ni gráficos) |
| **Cliente** | Ver únicamente sus propios pedidos e historial |

Todos los endpoints (excepto `/api/login/`) requieren el header:
```
Authorization: Token <token>
```

---

## Endpoints

### Autenticación

| Método | URL | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/login/` | Público | Iniciar sesión. Devuelve token y datos del usuario |
| POST | `/api/logout/` | Autenticado | Cerrar sesión. Elimina el token activo |

**POST `/api/login/`**
```json
// Request
{ "email": "...", "password": "..." }

// Response
{ "token": "...", "usuario": { "id": 1, "nombre": "...", "email": "...", "rol": "admin" } }
```

---

### Clientes

| Método | URL | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/clientes/buscar/` | Admin / Vendedor | Buscar un cliente por cédula, email o teléfono |

**GET `/api/clientes/buscar/?q=1050607080`**

Busca un usuario activo con rol `cliente` cuya cédula, email o teléfono coincida con el valor de `q`. Usado principalmente para validar e identificar al cliente antes de registrar un pedido.

```json
// Response 200
{
  "id": 4,
  "nombre": "Juan Pérez",
  "email": "juan@gmail.com",
  "cedula": "1050607080",
  "telefono": "3101234567"
}

// Response 404 — no encontrado o usuario inactivo
{ "error": "No se encontró un cliente activo con ese dato." }

// Response 400 — el usuario existe pero no es cliente
{ "error": "El usuario encontrado no tiene rol de cliente." }

// Response 400 — múltiples coincidencias (buscar por cédula para mayor precisión)
{ "error": "Se encontraron varios registros. Intenta con la cédula." }

// Response 400 — parámetro ausente
{ "error": "Proporciona cédula, correo o teléfono para buscar." }
```

---

### Pedidos

| Método | URL | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/pedidos/registrar/` | Admin / Vendedor | Registrar un nuevo pedido |
| PATCH | `/api/pedidos/<id>/editar/` | Admin / Vendedor | Cambiar el estado de un pedido |
| GET | `/api/pedidos/informe/` | Admin / Vendedor / Cliente | Listado de pedidos con filtros y resumen |
| GET | `/api/pedidos/estados/` | Admin / Vendedor | Listar todos los estados disponibles |
| GET | `/api/pedidos/<id>/historial/` | Autenticado | Timeline de creación y cambios de estado del pedido |

**POST `/api/pedidos/registrar/`**
```json
// Request
{
  "cliente_id": 5,
  "productos": [
    { "producto_id": 2, "cantidad": 1 },
    { "producto_id": 7, "cantidad": 3 }
  ]
}
```
Valida stock disponible, reserva unidades y calcula el total de forma atómica.

**PATCH `/api/pedidos/<id>/editar/`**
```json
// Request
{ "estado_id": 3, "motivo": "El cliente confirmó la dirección de envío." }
```
El campo `motivo` requiere mínimo 5 caracteres. Registra una entrada en el log de auditoría.

**Transiciones de estado permitidas:**

```
Registrado → En preparación | Cancelado
En preparación → Enviado | Cancelado
Enviado → Completado
Completado / Cancelado → (estado terminal, sin cambios)
```

**GET `/api/pedidos/informe/`** — parámetros opcionales:

| Param | Tipo | Descripción |
|---|---|---|
| `fecha_ini` | YYYY-MM-DD | Filtrar desde esta fecha |
| `fecha_fin` | YYYY-MM-DD | Filtrar hasta esta fecha |
| `estado_id` | int | Filtrar por estado |
| `cliente_id` | int | Filtrar por cliente (ignorado si el usuario es cliente) |
| `registrado_por_id` | int | Filtrar por vendedor |

Los clientes solo ven sus propios pedidos; los parámetros de filtro se ignoran para ese rol.

El campo `cliente_cedula` está incluido en la respuesta de cada pedido para permitir búsqueda y filtrado por cédula en el frontend.

**GET `/api/pedidos/<id>/historial/`** — sin parámetros.

Respuesta:
```json
{
  "pedido": { "id": 12, "cliente_nombre": "...", "registrado_por": "...", "total": "...", "estado": "...", "creado_en": "..." },
  "historial": [
    { "tipo": "creacion", "usuario": "...", "fecha": "...", "descripcion": "Pedido registrado en el sistema", "motivo": null },
    { "tipo": "cambio_estado", "usuario": "...", "fecha": "...", "descripcion": "Registrado → En preparación", "motivo": "..." }
  ]
}
```

---

### Informes (Solo Admin)

| Método | URL | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/pedidos/consolidado/` | Solo Admin | Resumen agregado de clientes, vendedores, productos y categorías |
| GET | `/api/pedidos/grafico/filtros/` | Solo Admin | Años, categorías y marcas disponibles para los dropdowns del gráfico |
| GET | `/api/pedidos/grafico/productos-mas-vendidos/` | Solo Admin | Top productos por unidades vendidas (solo pedidos Completados) |

**GET `/api/pedidos/consolidado/`** — sin parámetros.

Devuelve cuatro secciones con datos agregados de pedidos **Completados**:
- `clientes`: nombre, cédula, pedidos totales, total gastado y fecha del último pedido por cliente
- `vendedores`: pedidos totales, cancelados y ventas por vendedor
- `productos`: unidades vendidas, pedidos, ingresos totales y precio promedio por producto
- `categorias`: unidades vendidas, pedidos e ingresos totales por categoría

**GET `/api/pedidos/grafico/productos-mas-vendidos/`** — parámetros opcionales:

| Param | Tipo | Descripción |
|---|---|---|
| `anio` | int | Filtrar por año (ej. `2025`). Omitir = todos |
| `mes` | int 1–12 | Filtrar por mes. Requiere `anio` |
| `categoria_id` | int | Filtrar por categoría |
| `marca_id` | int | Filtrar por marca |
| `top` | int | Cantidad de productos a retornar (default `10`) |

Solo considera pedidos en estado **Completado**.

---

### Interoperabilidad

Endpoints para intercambiar datos de pedidos con otros sistemas. Todos los campos del esquema son opcionales excepto `sistema`; si el sistema externo no dispone de algún campo, simplemente lo omite y aparecerá vacío en la tabla consolidada.

| Método | URL | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/interop/exportar/` | Admin / Vendedor | Exporta los pedidos de OrByte en el esquema estándar |
| POST | `/api/interop/importar/` | Solo Admin | Importa y almacena pedidos de otro sistema |
| GET | `/api/interop/externos/` | Solo Admin | Lista todas las importaciones guardadas |
| DELETE | `/api/interop/externos/<id>/` | Solo Admin | Elimina una importación |

#### Esquema estándar (contrato para otros sistemas)

Estructura que **cualquier sistema debe enviar** al llamar a `/api/interop/importar/`:

```json
{
  "sistema": "NombreDelGrupo",
  "pedidos": [
    {
      "id_externo":  "42",
      "cliente":     "Juan Pérez",
      "vendedor":    "Ana García",
      "estado":      "Completado",
      "total":       150000.00,
      "fecha":       "2026-05-10T09:00:00Z",
      "productos": [
        {
          "nombre":          "Laptop",
          "categoria":       "Electrónica",
          "cantidad":        1,
          "precio_unitario": 150000.00
        }
      ]
    }
  ]
}
```

**GET `/api/interop/exportar/`** — parámetros opcionales:

| Param | Tipo | Descripción |
|---|---|---|
| `fecha_ini` | YYYY-MM-DD | Filtrar desde esta fecha |
| `fecha_fin` | YYYY-MM-DD | Filtrar hasta esta fecha |
| `estado` | string | Filtrar por nombre de estado (ej. `Completado`) |

Respuesta:
```json
{
  "sistema":      "OrByte",
  "version":      "1.0",
  "exportado_en": "2026-05-12T10:00:00Z",
  "pedidos": [
    {
      "sistema":    "OrByte",
      "id_externo": "12",
      "cliente":    "Juan Pérez",
      "vendedor":   "María García",
      "estado":     "Completado",
      "total":      150000.00,
      "fecha":      "2026-05-10T09:00:00Z",
      "productos": [
        { "nombre": "Mouse Inalámbrico", "categoria": "Periféricos", "cantidad": 2, "precio_unitario": 75000.00 }
      ]
    }
  ]
}
```

Cada pedido incluye el campo `sistema: "OrByte"` para que el frontend pueda identificar el origen al mostrar la tabla consolidada.
