# Weddly Studio

> Plataforma SaaS para la gestión integral de bodas — centralizada, automatizada y escalable.

---

## ¿Qué es Weddly Studio?

Weddly Studio es una aplicación web que permite a las parejas gestionar todos los aspectos de su boda desde un único entorno digital. Elimina la fragmentación de herramientas tradicionales (Excel, WhatsApp, Google Docs) y centraliza la organización en una sola plataforma multi-tenant preparada para producción real.

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Frontend | Angular (SPA) + Bootstrap |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL |
| Infraestructura | Docker Compose |
| Autenticación | JWT (Access + Refresh Token) |
| Pagos | Stripe / PayPal |
| Almacenamiento | S3 / MinIO |

---

## Módulos Principales

- **Onboarding** — Wizard guiado de 6 pasos para configurar la primera boda
- **Gestión de Bodas** — Crear, editar y archivar bodas según plan
- **Gestión de Invitados** — RSVP, menús especiales, estados y límites por plan
- **Plano de Mesas** — Editor visual con coordenadas X/Y y validación de capacidad
- **Checklist** — Tareas personalizadas con fechas límite y estados
- **Álbum Digital** — Subida colaborativa con moderación (pending / approved / rejected)
- **Facturación y Planes** — Control de suscripción, historial de pagos y facturas
- **Gestión de Roles** — Owner, co-organizador, wedding planner e invitado
- **Calendario y Exportaciones** — Exportación a Google Calendar y PDF (según plan)

---

## Modelo SaaS

| Plan | Precio | Bodas | Invitados | Fotos |
|---|---|---|---|---|
| Free | 0 € | 1 | Hasta 50 | Hasta 20 |
| Evento PRO | 49 € (único) | 1 | Ilimitados | Hasta 200 |
| Premium | 14 €/mes · 119 €/año | Ilimitadas | Ilimitados | Ilimitadas |

Los límites de cada plan se validan **a nivel backend**, no en el frontend.

---

## Arquitectura

```
Frontend (Angular SPA)
        ↓
Backend (Node.js / Express — API REST)
        ↓
Base de Datos (PostgreSQL)
```

### Estructura del backend

```
src/
├── routes/        # Definición de endpoints HTTP
├── controllers/   # Gestión de request/response
├── services/      # Lógica de negocio
├── models/        # Acceso a datos (PostgreSQL)
├── middleware/    # Auth, roles, límites SaaS
└── utils/         # Funciones auxiliares
```

### Entidades principales

`users` · `weddings` · `user_wedding_roles` · `guests` · `tables` · `checklist_tasks` · `photos` · `payments` · `invoices` · `activity_logs`

---

## Seguridad

- Autenticación mediante **JWT** con access token de duración limitada
- Contraseñas cifradas con **bcrypt**
- Aislamiento multi-tenant estricto por `wedding_id` en todas las consultas
- Soft delete en entidades críticas para evitar pérdida accidental de datos
- Middleware centralizado de validación de permisos y límites SaaS
- Sin almacenamiento de datos completos de tarjetas (delegado a Stripe/PayPal)

---

## Infraestructura Docker

```yaml
services:
  backend:   # Node.js + Express
  frontend:  # Angular
  db:        # PostgreSQL
```

Levantar el entorno de desarrollo:

```bash
docker compose up --build
```

---

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# ── Servidor ─────────────────────────────────
NODE_ENV=development
PORT=3000
RAILWAY_DOCKERFILE_PATH=Dockerfile

# ── Base de datos ─────────────────────────────
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/weddly_db

# ── Redis ─────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── JWT ───────────────────────────────────────
JWT_SECRET=tu_secreto_muy_largo_y_seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── CORS ──────────────────────────────────────
CORS_ORIGIN=http://localhost:4200

# ── Email ─────────────────────────────────────
EMAIL_FROM=Weddly Studio <no-reply@weddlystudio.uk>
RESEND_API_KEY=re_xxxxxxxxxxxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=usuario@example.com
SMTP_PASS=xxxxxxxxxxxx

# ── Frontend ──────────────────────────────────
FRONTEND_URL=http://localhost:4200

# ── AWS S3 ────────────────────────────────────
AWS_ACCESS_KEY_ID=xxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx
AWS_REGION=eu-west-1
AWS_S3_BUCKET=weddly-bucket

# ── Stripe ────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# ── PayPal ────────────────────────────────────
PAYPAL_CLIENT_ID=xxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxx

# ── Google OAuth ──────────────────────────────
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# ── OpenAI ────────────────────────────────────
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

---

## Instalación local (sin Docker)

```bash
# Clonar el repositorio
git clone https://github.com/javierp311204/weddly-studio.git
cd weddly-studio

# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
ng serve
```

---

## Planes y Restricciones

El sistema aplica restricciones automáticas según el plan activo:

- No se permite superar el límite de invitados del plan
- No se permite superar el límite de fotos del plan
- No se permite crear más bodas de las permitidas
- No se puede acceder a recursos de otra boda
- No se puede eliminar una boda con pagos activos

---

## Estado del Proyecto

| Componente | Estado |
|---|---|
| Backend (Node.js + PostgreSQL) | ✅ Estable |
| Sistema multi-tenant | ✅ Operativo |
| Control SaaS por planes | ✅ Implementado |
| Docker | ✅ Implementado |
| Frontend (Angular) | ✅ Estable |

---

## Roadmap

- **Fase 1** — Consolidación del core SaaS *(actual)*
- **Fase 2** — Marketplace integrado de proveedores
- **Fase 3** — Automatización avanzada y analítica
- **Fase 4** — Expansión internacional y multi-región

---

## Licencia

Todos los derechos reservados © 2026 Weddly Studio.

El código fuente, arquitectura, diseño y lógica de negocio son propiedad exclusiva del titular del proyecto. Queda prohibida la reproducción, ingeniería inversa o explotación comercial sin autorización expresa.

---

## Contacto

**Javier Alexander Perez Salas**
[linkedin.com/in/javiperezsalas](https://www.linkedin.com/in/javiperezsalas) · [github.com/javierp311204](https://github.com/javierp311204) · jperez.salas31@gmail.com · [javier-perez-portfolio.vercel.app](https://javier-perez-portfolio.vercel.app/)
