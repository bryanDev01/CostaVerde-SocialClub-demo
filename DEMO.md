# 🎬 Demo de portafolio — "Club Social Costa Verde"

> Esta es la **versión demo de portafolio** de un sistema de reservas y gestión de
> socios para un círculo social cubano. **Todo lo que ves aquí es ficticio**: la
> marca "Club Social Costa Verde", el empleador "Grupo Empresarial Marina", los
> logos, las ilustraciones, los correos, los teléfonos y todos los datos sembrados
> son inventados para poder mostrar el producto públicamente. El proyecto original
> es privado y no está representado en este repositorio.

---

## Qué demuestra este proyecto

Sistema completo (monorepo) de reservas para un club social multi-empresa:

| Flujo | Dónde |
|---|---|
| Precarga masiva de empleados por HR (CSV/Excel) | Panel `/hr` |
| Registro corporativo validado contra la precarga | `/register` |
| Muro de pago + reconciliación manual por Transfermóvil (QR + código de referencia + nº de operación) | `/payment/*` y panel admin |
| Reservas con control de aforo (global diario + por lugar) y bloqueo pesimista (`SELECT … FOR UPDATE`) | `/reservations/new` |
| Tope de 2 reservas activas/semana y confirmación a 48 h | reglas en `ReservationService` |
| Carné digital con QR firmado y check-in en recepción | `/profile/carnet`, `/receptionist` |
| Periodo de gracia y suspensión automática por impago (cron) | `src/jobs/` |
| Suscripciones 1/3/6/12 meses + acompañantes familiares (≤4) | `/profile` |
| Eventos con paquetes de catering y reservas de salón | `/events` |
| Reportes de ocupación e ingresos con export a Excel/DOCX | `/admin/reports` |
| Multi-tenant: cada empresa con su propio HR; roles admin/HR/recepción | JWT + permisos por rol |

**Stack:** Next.js (App Router) + Tailwind · Express + TypeScript estricto · PostgreSQL 15 · JWT · node-cron.

## Arquitectura de marca (white-label)

Toda la marca vive en `am-social-club-frontend/lib/branding.ts` (React/JSX) y en
`CLUB_NAME` (backend), alimentados por variables `NEXT_PUBLIC_BRAND_*`. Cambiar de
marca = cambiar env + assets en `public/`, **cero cambios de código**. Esta demo usa
esa misma capa con su marca ficticia.

---

## 1. Correr la demo en local

```bash
# 1 · Backend
cd am-social-club-backend
cp .env.example .env          # y pega tu DATABASE_URL de Aiven (ver §3)
npm install
npm run migrate               # aplica las 29 migraciones
npm run seed:demo             # siembra datos ficticios (usa --force: la demo es descartable)
npm run dev                   # API en http://localhost:4000

# 2 · Frontend (otra terminal)
cd am-social-club-frontend
npm install
npm run dev                   # http://localhost:3000
```

Para re-sembrar (p. ej. después de tocar datos durante una presentación): `npm run seed:demo`.

### Cuentas de prueba (password: `demo1234`)

| Rol | Email | Qué mostrar |
|---|---|---|
| Admin | `administrador@clubcostaverde.cu` | Panel admin, validar pagos (hay 1 pendiente), reportes |
| Recepción | `recepcion@clubcostaverde.cu` | Check-in por QR del carné, visitantes, cobros |
| HR Marina | `rrhh@clubcostaverde.cu` | Precarga de empleados (2 pendientes), usuarios de su empresa |
| HR Astilleros | `rrhh.aez@clubcostaverde.cu` | Multi-tenant: segunda empresa con su propio HR |
| Socio activo | `socio1@demo.costaverde.cu` | Dashboard, reservas, carné digital, acompañantes |
| Socio con pago pendiente | `socio9@demo.costaverde.cu` | **Muro de pago** completo: QR + referencia + operación |
| Socia suspendida | `socio7@demo.costaverde.cu` | Estado `suspended` (periodo de gracia vencido) |
| Externo | `externo1@demo.costaverde.cu` | Usuarios externos con suscripción propia |

Guion sugerido: landing → login de socio → reserva con aforo en vivo → carné QR →
check-in con cuenta de recepción → panel admin validando el pago pendiente → reporte
de ingresos.

## 2. Frontend → Vercel

1. Proyecto de Vercel conectado a **este** repositorio demo, rama `demo` (o `main`).
2. Variable de entorno: `NEXT_PUBLIC_API_URL=https://<tu-backend-demo>.onrender.com`.
   El resto de `NEXT_PUBLIC_BRAND_*` ya está en `.env.production` (o en la defaults de
   `branding.ts`); defínelas en el dashboard solo si quieres pasar por alto el archivo.
3. Cada push redespliega; el build hornea las variables `NEXT_PUBLIC_`.

## 3. Base de datos → Aiven (PostgreSQL)

1. Crea un servicio **PostgreSQL** (plan free) en [aiven.com](https://aiven.io).
2. Copia la **Service URI**: `postgres://avnadmin:***@<host>:<puerto>/defaultdb?sslmode=require`.
3. Backend `.env` (en Aiven/Railway o local):
   - `DATABASE_URL=<la URI>` · `DATABASE_SSL=true` · `DATABASE_SSL_REJECT_UNAUTHORIZED=false`
     (Aiven usa CA self-signed; `migrate.mjs`/`seed-demo.mjs` ya manejan el SSL).
   - `NODE_ENV=production` en el host; local puede ser `development`.
   - `CLUB_NAME=Club Social Costa Verde`
   - `CORS_ORIGIN=https://<tu-app>.vercel.app` (tu URL de Vercel; en local `http://localhost:3000`)
4. Despliega el backend en Railway/Render (`npm run build && npm start`) y ejecuta una
   vez `npm run migrate && npm run seed:demo` como *one-off* o desde tu máquina.

## 4. Límites conocidos de la demo

- Pago **Transfermóvil manual** (sin pasarela real ni webhook): el QR es un placeholder.
- Las notificaciones son in-app (no se envían emails), a propósito.
- `npm run seed:demo` **vacia y re-siembra** las tablas de negocio de la DB conectada:
  úsalo solo contra la base de demo (el script exige `--force` como guarda).
