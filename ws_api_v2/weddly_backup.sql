--
-- PostgreSQL database dump
--

\restrict PedHhh85uMVxtepgoZqrpojcYmolmDXBPt1aKhNDOAJbgQMSs4go22DFUm2jXgw

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: weddly
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO weddly;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: weddly
--

COMMENT ON SCHEMA public IS '';


--
-- Name: EventType; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."EventType" AS ENUM (
    'task',
    'custom'
);


ALTER TYPE public."EventType" OWNER TO weddly;

--
-- Name: GlobalRole; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."GlobalRole" AS ENUM (
    'user',
    'admin',
    'superadmin'
);


ALTER TYPE public."GlobalRole" OWNER TO weddly;

--
-- Name: GuestShape; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."GuestShape" AS ENUM (
    'round',
    'rectangular'
);


ALTER TYPE public."GuestShape" OWNER TO weddly;

--
-- Name: InvitationTemplate; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."InvitationTemplate" AS ENUM (
    'elegant',
    'modern',
    'rustic',
    'minimalist'
);


ALTER TYPE public."InvitationTemplate" OWNER TO weddly;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);


ALTER TYPE public."PaymentStatus" OWNER TO weddly;

--
-- Name: PhotoStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."PhotoStatus" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'deleted'
);


ALTER TYPE public."PhotoStatus" OWNER TO weddly;

--
-- Name: PlanType; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."PlanType" AS ENUM (
    'free',
    'one_time',
    'subscription'
);


ALTER TYPE public."PlanType" OWNER TO weddly;

--
-- Name: RsvpStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."RsvpStatus" AS ENUM (
    'pending',
    'confirmed',
    'declined'
);


ALTER TYPE public."RsvpStatus" OWNER TO weddly;

--
-- Name: SendStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."SendStatus" AS ENUM (
    'sent',
    'failed'
);


ALTER TYPE public."SendStatus" OWNER TO weddly;

--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'active',
    'cancelled',
    'past_due',
    'trialing',
    'inactive'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO weddly;

--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public."TaskStatus" OWNER TO weddly;

--
-- Name: WeddingRole; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."WeddingRole" AS ENUM (
    'owner',
    'co_organizer',
    'planner',
    'guest'
);


ALTER TYPE public."WeddingRole" OWNER TO weddly;

--
-- Name: WeddingStatus; Type: TYPE; Schema: public; Owner: weddly
--

CREATE TYPE public."WeddingStatus" AS ENUM (
    'active',
    'readonly',
    'archived',
    'cancelled'
);


ALTER TYPE public."WeddingStatus" OWNER TO weddly;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO weddly;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.activity_logs (
    id uuid NOT NULL,
    user_id uuid,
    wedding_id uuid,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(36) NOT NULL,
    action character varying(50) NOT NULL,
    old_value_json jsonb,
    new_value_json jsonb,
    ip_address character varying(45),
    user_agent character varying(500),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO weddly;

--
-- Name: events; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.events (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type public."EventType" DEFAULT 'custom'::public."EventType" NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone,
    google_event_id character varying(255),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.events OWNER TO weddly;

--
-- Name: guests; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.guests (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    parent_guest_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(255),
    phone character varying(30),
    rsvp_status public."RsvpStatus" DEFAULT 'pending'::public."RsvpStatus" NOT NULL,
    allergies text,
    dietary_notes text,
    invitation_code character varying(50),
    table_id uuid,
    seat_number integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.guests OWNER TO weddly;

--
-- Name: invitation_sends; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.invitation_sends (
    id uuid NOT NULL,
    invitation_id uuid NOT NULL,
    guest_id uuid NOT NULL,
    sent_by uuid NOT NULL,
    status public."SendStatus" DEFAULT 'sent'::public."SendStatus" NOT NULL,
    error_message text,
    sent_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invitation_sends OWNER TO weddly;

--
-- Name: invitations; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.invitations (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    template_type public."InvitationTemplate" DEFAULT 'elegant'::public."InvitationTemplate" NOT NULL,
    background character varying(100),
    primary_color character varying(20),
    secondary_color character varying(20),
    custom_text text,
    pdf_url character varying(1000),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.invitations OWNER TO weddly;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid,
    stripe_payment_id character varying(255),
    paypal_payment_id character varying(255),
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    status public."PaymentStatus" DEFAULT 'pending'::public."PaymentStatus" NOT NULL,
    description character varying(500),
    invoice_pdf_url character varying(1000),
    metadata_json jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO weddly;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.photos (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    approved_by uuid,
    url character varying(1000) NOT NULL,
    thumbnail_url character varying(1000),
    file_size integer,
    mime_type character varying(50),
    status public."PhotoStatus" DEFAULT 'pending'::public."PhotoStatus" NOT NULL,
    caption text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.photos OWNER TO weddly;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.plans (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    max_weddings integer DEFAULT 1 NOT NULL,
    max_photos integer DEFAULT 20 NOT NULL,
    max_guests integer DEFAULT 40 NOT NULL,
    features_json jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.plans OWNER TO weddly;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    stripe_subscription_id character varying(255),
    paypal_subscription_id character varying(255),
    status public."SubscriptionStatus" DEFAULT 'inactive'::public."SubscriptionStatus" NOT NULL,
    current_period_start timestamp(3) without time zone,
    current_period_end timestamp(3) without time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO weddly;

--
-- Name: tables; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.tables (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    shape public."GuestShape" DEFAULT 'round'::public."GuestShape" NOT NULL,
    pos_x double precision DEFAULT 50 NOT NULL,
    pos_y double precision DEFAULT 50 NOT NULL,
    max_capacity integer DEFAULT 10 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tables OWNER TO weddly;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.tasks (
    id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    template_id uuid,
    title character varying(255) NOT NULL,
    description text,
    phase character varying(50),
    category character varying(50),
    status public."TaskStatus" DEFAULT 'pending'::public."TaskStatus" NOT NULL,
    assigned_user_id uuid,
    due_date timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tasks OWNER TO weddly;

--
-- Name: user_wedding_roles; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.user_wedding_roles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    wedding_id uuid NOT NULL,
    role public."WeddingRole" NOT NULL,
    assigned_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_wedding_roles OWNER TO weddly;

--
-- Name: users; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    nickname character varying(50),
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    phone character varying(30),
    gender character varying(20),
    language character varying(10) DEFAULT 'es'::character varying NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret character varying(255),
    role_global public."GlobalRole" DEFAULT 'user'::public."GlobalRole" NOT NULL,
    google_id character varying(255),
    avatar_url character varying(500),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    email_verification_expires timestamp(3) without time zone,
    email_verification_token character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    tfa_enabled boolean DEFAULT false NOT NULL,
    tfa_secret text,
    tfa_reset_token text,
    tfa_reset_expires timestamp with time zone
);


ALTER TABLE public.users OWNER TO weddly;

--
-- Name: wedding_invites; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.wedding_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wedding_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    email character varying(255) NOT NULL,
    role public."WeddingRole" NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    accepted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.wedding_invites OWNER TO weddly;

--
-- Name: weddings; Type: TABLE; Schema: public; Owner: weddly
--

CREATE TABLE public.weddings (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    wedding_date timestamp(3) without time zone NOT NULL,
    location_name character varying(200),
    address character varying(500),
    dress_code character varying(200),
    menu_description text,
    rsvp_deadline timestamp(3) without time zone,
    plan_type public."PlanType" DEFAULT 'free'::public."PlanType" NOT NULL,
    status public."WeddingStatus" DEFAULT 'active'::public."WeddingStatus" NOT NULL,
    created_by uuid NOT NULL,
    archived_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE public.weddings OWNER TO weddly;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
cc4858a5-ffe9-4afa-af2f-5600d66a17ec	64fe587800b77db4a481aae1ea4f4995be57b299c2bf6395bd5f284904ed7337	2026-03-09 10:51:16.727294+00	20260225203625_init	\N	\N	2026-03-09 10:51:16.033161+00	1
39f9b003-43ce-4f6a-a7c3-3b3fcd6f79e4	3f41b3972613985c3a0bc5733a6ede1df13a4ea447cbc35a8bb49c9da5530bc2	2026-03-09 10:51:16.789994+00	20260304000042_add_email_verification	\N	\N	2026-03-09 10:51:16.734761+00	1
2e1e40aa-b520-455d-a50b-92821fdc1326	4bbf1eff1d78d2e7827d5c5a7f78c40840ab6fb08cb246f8550e2a41cd6c24be	2026-03-09 10:54:43.080165+00	20260309105121_refactor_wedding_roles_and_invites		\N	2026-03-09 10:54:43.080165+00	0
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.activity_logs (id, user_id, wedding_id, entity_type, entity_id, action, old_value_json, new_value_json, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.events (id, wedding_id, title, description, event_type, start_date, end_date, google_event_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.guests (id, wedding_id, parent_guest_id, first_name, last_name, email, phone, rsvp_status, allergies, dietary_notes, invitation_code, table_id, seat_number, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: invitation_sends; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.invitation_sends (id, invitation_id, guest_id, sent_by, status, error_message, sent_at) FROM stdin;
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.invitations (id, wedding_id, template_type, background, primary_color, secondary_color, custom_text, pdf_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.payments (id, user_id, wedding_id, stripe_payment_id, paypal_payment_id, amount, currency, status, description, invoice_pdf_url, metadata_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.photos (id, wedding_id, uploaded_by, approved_by, url, thumbnail_url, file_size, mime_type, status, caption, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.plans (id, name, price, currency, max_weddings, max_photos, max_guests, features_json, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.subscriptions (id, user_id, plan_id, stripe_subscription_id, paypal_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.tables (id, wedding_id, name, shape, pos_x, pos_y, max_capacity, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.tasks (id, wedding_id, template_id, title, description, phase, category, status, assigned_user_id, due_date, completed_at, created_at, updated_at) FROM stdin;
1a0e845b-35f4-45c4-abae-131d15926635	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Definir presupuesto total	Establece un presupuesto realista y reparte las partidas principales.	12_months	budget	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
4bda5391-1b61-4e19-9261-298c2fd3709a	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Elegir y reservar el lugar de la ceremonia	Visita al menos 3 opciones antes de decidir. Confirma disponibilidad para tu fecha.	12_months	venue	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
dff2151f-3828-4a4d-bd77-98d08e1d014b	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Elegir y reservar el lugar del banquete	Puede ser el mismo que la ceremonia o uno diferente.	12_months	venue	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
a838b27f-97f8-4f88-a3fe-96b25aaf4764	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Hacer lista preliminar de invitados	Número orientativo para negociar con el venue y el catering.	12_months	guests	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
d9a38e9d-d721-4f9d-9683-7393ea72e2f8	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Iniciar trámites legales del matrimonio	Consulta en el registro civil o notaría los documentos necesarios.	12_months	legal	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
83191331-cf83-4913-9524-55a42b055169	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Contratar fotógrafo	Revisa portfolios, lee reseñas y reserva con antelación.	9_months	photography	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
3f0e2701-120e-4d94-ba1d-20b1c6159c7e	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Contratar videógrafo	Opcional. Decide si quieres vídeo completo, highlights o drone.	9_months	photography	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
592ce9b2-736a-4267-9826-82746d993a31	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Contratar música (DJ o banda)	Define el estilo musical para ceremonia, cóctel y banquete.	9_months	music	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
e53a36c6-ecde-4eb4-946a-4399ef9a60a1	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Elegir servicio de catering	Solicita al menos 3 presupuestos. Organiza una degustación.	9_months	catering	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
dc1011fa-bd2f-434a-82c4-47a7b44afa81	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Empezar búsqueda del vestido de novia	Los vestidos pueden tardar 4-6 meses en llegar. Empieza cuanto antes.	9_months	attire	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
cc462a00-77df-4c79-a4f4-430f20547cb5	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar vestido de novia	Realiza el pedido oficial y programa las pruebas.	6_months	attire	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
64a530c7-7f31-4bf9-9999-5b27b09ab937	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Elegir traje del novio	Compra o alquiler. Coordinar con el estilo del vestido.	6_months	attire	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
943330df-2a96-4ca1-874f-37cb92bfab9e	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Contratar florista	Define el estilo floral: ramo, centros de mesa, decoración ceremonia.	6_months	flowers	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
aa0043b9-82a5-4f3c-97f3-2d07454c2a38	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Elegir tarta nupcial	Organiza una degustación con al menos 2 pasteleros.	6_months	cake	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
e87258ca-3766-45c8-84ab-84f3f0ac2a64	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Planificar viaje de novios	Reserva vuelos y alojamiento con antelación para mejores precios.	6_months	honeymoon	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
cdda2205-55ea-4bb0-b717-0f9b9cf94c23	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Diseñar invitaciones	Define el diseño y texto. Recuerda incluir fecha límite de RSVP.	6_months	invitations	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
1b32e126-63fc-49ff-a808-2345b6c752f0	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Enviar invitaciones	Envía con al menos 2-3 meses de antelación.	3_months	invitations	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
76254457-2ee2-4487-9236-3ed5f4ead9a9	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar lista definitiva de invitados	Cierra la lista para comunicar número final al catering.	3_months	guests	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
374355b1-5267-4a14-b1e0-28dd3c3954de	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Reservar peluquería y maquillaje	Haz una prueba previa para confirmar el look.	3_months	beauty	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
8b4f59e9-2e59-4460-a53a-abdfb0f1219b	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Encargar alianzas	Elige material, diseño y graba la inscripción si lo deseas.	3_months	rings	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
b851cbf7-8bad-43a3-853e-d670b8ab63e2	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Contratar transporte nupcial	Coche de novios, autobús para invitados, etc.	3_months	transport	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
b764e41f-7685-4a0e-9a00-20be3e85aa49	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Gestionar alojamiento para invitados de fuera	Negocia tarifas especiales con hoteles cercanos.	3_months	accommodation	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
be3b4d81-6f31-4309-a068-c780cd3f9760	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar número final de asistentes al catering	La mayoría de caterings pide confirmación 3-4 semanas antes.	1_month	guests	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
7e690fed-97df-4624-b031-2020a4518e8c	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar detalles con todos los proveedores	Llama o escribe a cada proveedor para reconfirmar hora y detalles.	1_month	venue	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
82d5af1b-43e5-4652-a8e0-0a5e4c0b8482	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Prueba final del vestido/traje	Asegúrate de que los ajustes están perfectos.	1_month	attire	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
ed4d8dfb-3348-4f9a-bd1d-afdeb7c68990	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Organizar la distribución de mesas	Asigna cada invitado a su mesa teniendo en cuenta afinidades.	1_month	tables	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
616a710a-8480-4b56-aef5-84abd63e4442	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Preparar el orden de la ceremonia	Define lecturas, música, votos y tiempos.	1_month	ceremony	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
ddd7c5df-b6d1-4544-b665-1d24aac8483b	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar hora y lugar con el officiant/juez	Último recordatorio para quien oficia la ceremonia.	1_week	legal	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
c6c51800-ace4-4151-a410-c1630973effc	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Preparar sobres con pagos para proveedores	Muchos proveedores cobran en efectivo el día de la boda.	1_week	budget	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
32a12768-7b9d-4144-b2a3-c08d051f9d15	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Confirmar cita de peluquería y maquillaje	Confirma hora, lugar y número de personas.	1_week	beauty	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
406f2d17-341f-4dcc-9e9b-89fc96a5799a	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Recoger vestido/traje	Recoge y comprueba que todo esté en perfecto estado.	1_week	attire	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
65ed5165-16dd-4a6d-8e88-1336d41185a7	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	\N	Visita final al venue	Repasa la decoración, distribución de mesas y accesos.	1_week	venue	pending	\N	\N	\N	2026-03-09 15:41:08.377	2026-03-09 15:41:08.377
\.


--
-- Data for Name: user_wedding_roles; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.user_wedding_roles (id, user_id, wedding_id, role, assigned_at) FROM stdin;
a5635914-80fc-4de5-9157-c08b2aab800f	8ed4a801-47f8-4659-b648-c78ad0f76705	0408e8a2-d7f7-4d46-8d93-e27ad95ff792	owner	2026-03-09 14:41:27.388
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.users (id, first_name, last_name, nickname, email, password_hash, phone, gender, language, two_factor_enabled, two_factor_secret, role_global, google_id, avatar_url, created_at, updated_at, deleted_at, email_verification_expires, email_verification_token, email_verified, tfa_enabled, tfa_secret, tfa_reset_token, tfa_reset_expires) FROM stdin;
8ed4a801-47f8-4659-b648-c78ad0f76705	Javier	Perez	\N	jperez.salas31@gmail.com	$2a$12$6BjOa/opsNjqzvsFkkPCMOQGeSmQ95VKFm3K0DLQwBj1MuKFS7gs6	\N	\N	es	f	\N	user	\N	avatars/8ed4a801-47f8-4659-b648-c78ad0f76705/25254cb8-66d5-45ed-97a4-b9d49ffb54b5.webp	2026-03-09 13:14:09.938	2026-03-09 16:05:39.915	\N	2026-03-10 13:14:09.933	f129e95813f2da192f1ebd282d64a421c0852a6a12957582cc582bfb61f56b1b	f	f	\N	4944ce16019039fad39419f377cf005fbedf3e5e915bf20a5932b34da62ff7a9	2026-03-09 16:34:17.072+00
\.


--
-- Data for Name: wedding_invites; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.wedding_invites (id, wedding_id, invited_by, email, role, token, expires_at, accepted_at, created_at) FROM stdin;
\.


--
-- Data for Name: weddings; Type: TABLE DATA; Schema: public; Owner: weddly
--

COPY public.weddings (id, name, wedding_date, location_name, address, dress_code, menu_description, rsvp_deadline, plan_type, status, created_by, archived_at, created_at, updated_at, deleted_at) FROM stdin;
0408e8a2-d7f7-4d46-8d93-e27ad95ff792	Prueba	2026-03-19 11:00:00	sdf	\N	\N	\N	\N	free	active	8ed4a801-47f8-4659-b648-c78ad0f76705	\N	2026-03-09 14:41:27.374	2026-03-09 14:41:27.374	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: invitation_sends invitation_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitation_sends
    ADD CONSTRAINT invitation_sends_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_wedding_roles user_wedding_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.user_wedding_roles
    ADD CONSTRAINT user_wedding_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wedding_invites wedding_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.wedding_invites
    ADD CONSTRAINT wedding_invites_pkey PRIMARY KEY (id);


--
-- Name: weddings weddings_pkey; Type: CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.weddings
    ADD CONSTRAINT weddings_pkey PRIMARY KEY (id);


--
-- Name: activity_logs_created_at_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX activity_logs_created_at_idx ON public.activity_logs USING btree (created_at);


--
-- Name: activity_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX activity_logs_entity_type_entity_id_idx ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: activity_logs_user_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX activity_logs_user_id_idx ON public.activity_logs USING btree (user_id);


--
-- Name: activity_logs_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX activity_logs_wedding_id_idx ON public.activity_logs USING btree (wedding_id);


--
-- Name: events_start_date_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX events_start_date_idx ON public.events USING btree (start_date);


--
-- Name: events_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX events_wedding_id_idx ON public.events USING btree (wedding_id);


--
-- Name: guests_deleted_at_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX guests_deleted_at_idx ON public.guests USING btree (deleted_at);


--
-- Name: guests_invitation_code_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX guests_invitation_code_key ON public.guests USING btree (invitation_code);


--
-- Name: guests_parent_guest_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX guests_parent_guest_id_idx ON public.guests USING btree (parent_guest_id);


--
-- Name: guests_rsvp_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX guests_rsvp_status_idx ON public.guests USING btree (rsvp_status);


--
-- Name: guests_table_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX guests_table_id_idx ON public.guests USING btree (table_id);


--
-- Name: guests_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX guests_wedding_id_idx ON public.guests USING btree (wedding_id);


--
-- Name: idx_users_tfa_reset_token; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX idx_users_tfa_reset_token ON public.users USING btree (tfa_reset_token) WHERE (tfa_reset_token IS NOT NULL);


--
-- Name: invitation_sends_guest_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX invitation_sends_guest_id_idx ON public.invitation_sends USING btree (guest_id);


--
-- Name: invitation_sends_invitation_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX invitation_sends_invitation_id_idx ON public.invitation_sends USING btree (invitation_id);


--
-- Name: invitations_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX invitations_wedding_id_idx ON public.invitations USING btree (wedding_id);


--
-- Name: payments_paypal_payment_id_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX payments_paypal_payment_id_key ON public.payments USING btree (paypal_payment_id);


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_stripe_payment_id_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX payments_stripe_payment_id_key ON public.payments USING btree (stripe_payment_id);


--
-- Name: payments_user_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX payments_user_id_idx ON public.payments USING btree (user_id);


--
-- Name: payments_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX payments_wedding_id_idx ON public.payments USING btree (wedding_id);


--
-- Name: photos_deleted_at_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX photos_deleted_at_idx ON public.photos USING btree (deleted_at);


--
-- Name: photos_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX photos_status_idx ON public.photos USING btree (status);


--
-- Name: photos_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX photos_wedding_id_idx ON public.photos USING btree (wedding_id);


--
-- Name: plans_name_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX plans_name_key ON public.plans USING btree (name);


--
-- Name: subscriptions_paypal_subscription_id_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX subscriptions_paypal_subscription_id_key ON public.subscriptions USING btree (paypal_subscription_id);


--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);


--
-- Name: subscriptions_stripe_subscription_id_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: subscriptions_user_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX subscriptions_user_id_idx ON public.subscriptions USING btree (user_id);


--
-- Name: tables_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX tables_wedding_id_idx ON public.tables USING btree (wedding_id);


--
-- Name: tasks_assigned_user_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX tasks_assigned_user_id_idx ON public.tasks USING btree (assigned_user_id);


--
-- Name: tasks_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX tasks_status_idx ON public.tasks USING btree (status);


--
-- Name: tasks_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX tasks_wedding_id_idx ON public.tasks USING btree (wedding_id);


--
-- Name: user_wedding_roles_user_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX user_wedding_roles_user_id_idx ON public.user_wedding_roles USING btree (user_id);


--
-- Name: user_wedding_roles_user_id_wedding_id_role_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX user_wedding_roles_user_id_wedding_id_role_key ON public.user_wedding_roles USING btree (user_id, wedding_id, role);


--
-- Name: user_wedding_roles_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX user_wedding_roles_wedding_id_idx ON public.user_wedding_roles USING btree (wedding_id);


--
-- Name: users_deleted_at_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX users_deleted_at_idx ON public.users USING btree (deleted_at);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_email_verification_token_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX users_email_verification_token_idx ON public.users USING btree (email_verification_token);


--
-- Name: users_email_verification_token_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX users_email_verification_token_key ON public.users USING btree (email_verification_token);


--
-- Name: users_google_id_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX users_google_id_key ON public.users USING btree (google_id);


--
-- Name: wedding_invites_email_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX wedding_invites_email_idx ON public.wedding_invites USING btree (email);


--
-- Name: wedding_invites_token_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX wedding_invites_token_idx ON public.wedding_invites USING btree (token);


--
-- Name: wedding_invites_token_key; Type: INDEX; Schema: public; Owner: weddly
--

CREATE UNIQUE INDEX wedding_invites_token_key ON public.wedding_invites USING btree (token);


--
-- Name: wedding_invites_wedding_id_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX wedding_invites_wedding_id_idx ON public.wedding_invites USING btree (wedding_id);


--
-- Name: weddings_created_by_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX weddings_created_by_idx ON public.weddings USING btree (created_by);


--
-- Name: weddings_deleted_at_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX weddings_deleted_at_idx ON public.weddings USING btree (deleted_at);


--
-- Name: weddings_status_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX weddings_status_idx ON public.weddings USING btree (status);


--
-- Name: weddings_wedding_date_idx; Type: INDEX; Schema: public; Owner: weddly
--

CREATE INDEX weddings_wedding_date_idx ON public.weddings USING btree (wedding_date);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: events events_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: guests guests_parent_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_parent_guest_id_fkey FOREIGN KEY (parent_guest_id) REFERENCES public.guests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: guests guests_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: guests guests_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invitation_sends invitation_sends_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitation_sends
    ADD CONSTRAINT invitation_sends_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invitation_sends invitation_sends_invitation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitation_sends
    ADD CONSTRAINT invitation_sends_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invitation_sends invitation_sends_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitation_sends
    ADD CONSTRAINT invitation_sends_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invitations invitations_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: photos photos_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: photos photos_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: photos photos_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tables tables_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_wedding_roles user_wedding_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.user_wedding_roles
    ADD CONSTRAINT user_wedding_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_wedding_roles user_wedding_roles_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.user_wedding_roles
    ADD CONSTRAINT user_wedding_roles_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wedding_invites wedding_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.wedding_invites
    ADD CONSTRAINT wedding_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: wedding_invites wedding_invites_wedding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.wedding_invites
    ADD CONSTRAINT wedding_invites_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;


--
-- Name: weddings weddings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: weddly
--

ALTER TABLE ONLY public.weddings
    ADD CONSTRAINT weddings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: weddly
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict PedHhh85uMVxtepgoZqrpojcYmolmDXBPt1aKhNDOAJbgQMSs4go22DFUm2jXgw

