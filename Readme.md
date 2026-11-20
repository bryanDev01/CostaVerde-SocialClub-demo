# CostaVerde SocialClub Demo — Club Social Costa Verde (Portfolio Demo)

> ⚠️ **Demo ficticia de portafolio.** Marca, empresa, logos, ilustraciones, contactos y
> datos sembrados son inventados. See [DEMO.md](./DEMO.md) for the full walkthrough.

Sistema de reservas y gestión de socios para un círculo social cubano multi-empresa:
precarga de empleados por RRHH, registro corporativo y externo, suscripciones con
pago manual vía Transfermóvil (conciliación por administración), reservas con control
de aforo en tiempo real (lock pesimista), carné digital con QR firmado, check-in en
recepción, eventos de catering, periodos de gracia/suspensión automáticos y reportes
de ocupación e ingresos.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router, sin `/src`) · TypeScript estricto · Tailwind |
| Backend | Express · TypeScript · JWT + roles/permisos · node-cron |
| Base de datos | PostgreSQL 15 (transaccional, `SELECT … FOR UPDATE` para aforo) |
| Reglas de negocio | Servicios de dominio (`services/*.ts`) con validaciones duras |
| Marca | White-label por variables de entorno (`lib/branding.ts` / `CLUB_NAME`) |

## Estructura

```
CostaVerde-SocialClub-demo/
├── am-social-club-frontend/   # Next.js (puerto 3000)
├── am-social-club-backend/    # Express API (puerto 4000)
│   └── scripts/seed-demo.mjs  # Datos ficticios para la demo
├── docker-compose.yml         # PostgreSQL local opcional
└── DEMO.md                    # Guía de la demo (cuentas, flujo, despliegue)
```

## Quickstart

```bash
# Backend
cd am-social-club-backend
cp .env.example .env    # configura DATABASE_URL (Aiven o Docker local)
npm install && npm run migrate && npm run seed:demo && npm run dev

# Frontend (otra terminal)
cd am-social-club-frontend
npm install && npm run dev
```

Abre <http://localhost:3000> e inicia sesión con `socio1@demo.costaverde.cu` / `demo1234`
(o cualquiera de las cuentas de [DEMO.md](./DEMO.md)).

## Reglas de negocio implementadas

- Un usuario solo puede tener **2 reservas activas por semana**.
- **Aforo**: tope global diario + capacidad por lugar, validado transaccionalmente.
- **Periodo de gracia**: 5 días tras el vencimiento; al día 6 la cuenta queda `suspended`
  y un cron lo aplica automáticamente.
- **Precarga HR**: los empleados existen antes de registrarse; el registro valida el CI.
- **Conciliación de pago**: el socio paga por Transfermóvil y reporta el número de
  operación; admin valida o rechaza antes de activar la suscripción.
- **Carné QR firmado**: imposible de forjar (HMAC con `JWT_SECRET`), verificado en recepción.
- **Acompañantes**: hasta 4 familiares sin cuenta propia, cubiertos por el titular.
