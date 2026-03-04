-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('user', 'admin', 'superadmin');

-- CreateEnum
CREATE TYPE "WeddingRole" AS ENUM ('bride', 'groom', 'planner', 'guest');

-- CreateEnum
CREATE TYPE "WeddingStatus" AS ENUM ('active', 'readonly', 'archived', 'cancelled');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('free', 'one_time', 'subscription');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('pending', 'confirmed', 'declined');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('pending', 'approved', 'rejected', 'deleted');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('task', 'custom');

-- CreateEnum
CREATE TYPE "InvitationTemplate" AS ENUM ('elegant', 'modern', 'rustic', 'minimalist');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('sent', 'failed');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'inactive');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "GuestShape" AS ENUM ('round', 'rectangular');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "nickname" VARCHAR(50),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "phone" VARCHAR(30),
    "gender" VARCHAR(20),
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" VARCHAR(255),
    "role_global" "GlobalRole" NOT NULL DEFAULT 'user',
    "google_id" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weddings" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "wedding_date" TIMESTAMP(3) NOT NULL,
    "location_name" VARCHAR(200),
    "address" VARCHAR(500),
    "dress_code" VARCHAR(200),
    "menu_description" TEXT,
    "rsvp_deadline" TIMESTAMP(3),
    "plan_type" "PlanType" NOT NULL DEFAULT 'free',
    "status" "WeddingStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "weddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wedding_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "role" "WeddingRole" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wedding_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "parent_guest_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "rsvp_status" "RsvpStatus" NOT NULL DEFAULT 'pending',
    "allergies" TEXT,
    "dietary_notes" TEXT,
    "invitation_code" VARCHAR(50),
    "table_id" UUID,
    "seat_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "shape" "GuestShape" NOT NULL DEFAULT 'round',
    "pos_x" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "pos_y" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "max_capacity" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "approved_by" UUID,
    "url" VARCHAR(1000) NOT NULL,
    "thumbnail_url" VARCHAR(1000),
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "status" "PhotoStatus" NOT NULL DEFAULT 'pending',
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "template_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "phase" VARCHAR(50),
    "category" VARCHAR(50),
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "assigned_user_id" UUID,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "event_type" "EventType" NOT NULL DEFAULT 'custom',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "google_event_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "template_type" "InvitationTemplate" NOT NULL DEFAULT 'elegant',
    "background" VARCHAR(100),
    "primary_color" VARCHAR(20),
    "secondary_color" VARCHAR(20),
    "custom_text" TEXT,
    "pdf_url" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_sends" (
    "id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "sent_by" UUID NOT NULL,
    "status" "SendStatus" NOT NULL DEFAULT 'sent',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "max_weddings" INTEGER NOT NULL DEFAULT 1,
    "max_photos" INTEGER NOT NULL DEFAULT 20,
    "max_guests" INTEGER NOT NULL DEFAULT 40,
    "features_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "stripe_subscription_id" VARCHAR(255),
    "paypal_subscription_id" VARCHAR(255),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wedding_id" UUID,
    "stripe_payment_id" VARCHAR(255),
    "paypal_payment_id" VARCHAR(255),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "description" VARCHAR(500),
    "invoice_pdf_url" VARCHAR(1000),
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "wedding_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "old_value_json" JSONB,
    "new_value_json" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "weddings_created_by_idx" ON "weddings"("created_by");

-- CreateIndex
CREATE INDEX "weddings_status_idx" ON "weddings"("status");

-- CreateIndex
CREATE INDEX "weddings_wedding_date_idx" ON "weddings"("wedding_date");

-- CreateIndex
CREATE INDEX "weddings_deleted_at_idx" ON "weddings"("deleted_at");

-- CreateIndex
CREATE INDEX "user_wedding_roles_wedding_id_idx" ON "user_wedding_roles"("wedding_id");

-- CreateIndex
CREATE INDEX "user_wedding_roles_user_id_idx" ON "user_wedding_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_wedding_roles_user_id_wedding_id_role_key" ON "user_wedding_roles"("user_id", "wedding_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "guests_invitation_code_key" ON "guests"("invitation_code");

-- CreateIndex
CREATE INDEX "guests_wedding_id_idx" ON "guests"("wedding_id");

-- CreateIndex
CREATE INDEX "guests_table_id_idx" ON "guests"("table_id");

-- CreateIndex
CREATE INDEX "guests_parent_guest_id_idx" ON "guests"("parent_guest_id");

-- CreateIndex
CREATE INDEX "guests_rsvp_status_idx" ON "guests"("rsvp_status");

-- CreateIndex
CREATE INDEX "guests_deleted_at_idx" ON "guests"("deleted_at");

-- CreateIndex
CREATE INDEX "tables_wedding_id_idx" ON "tables"("wedding_id");

-- CreateIndex
CREATE INDEX "photos_wedding_id_idx" ON "photos"("wedding_id");

-- CreateIndex
CREATE INDEX "photos_status_idx" ON "photos"("status");

-- CreateIndex
CREATE INDEX "photos_deleted_at_idx" ON "photos"("deleted_at");

-- CreateIndex
CREATE INDEX "tasks_wedding_id_idx" ON "tasks"("wedding_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_assigned_user_id_idx" ON "tasks"("assigned_user_id");

-- CreateIndex
CREATE INDEX "events_wedding_id_idx" ON "events"("wedding_id");

-- CreateIndex
CREATE INDEX "events_start_date_idx" ON "events"("start_date");

-- CreateIndex
CREATE INDEX "invitations_wedding_id_idx" ON "invitations"("wedding_id");

-- CreateIndex
CREATE INDEX "invitation_sends_invitation_id_idx" ON "invitation_sends"("invitation_id");

-- CreateIndex
CREATE INDEX "invitation_sends_guest_id_idx" ON "invitation_sends"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_paypal_subscription_id_key" ON "subscriptions"("paypal_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_id_key" ON "payments"("stripe_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paypal_payment_id_key" ON "payments"("paypal_payment_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_wedding_id_idx" ON "payments"("wedding_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_wedding_id_idx" ON "activity_logs"("wedding_id");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wedding_roles" ADD CONSTRAINT "user_wedding_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wedding_roles" ADD CONSTRAINT "user_wedding_roles_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_parent_guest_id_fkey" FOREIGN KEY ("parent_guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_sends" ADD CONSTRAINT "invitation_sends_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_sends" ADD CONSTRAINT "invitation_sends_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_sends" ADD CONSTRAINT "invitation_sends_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
