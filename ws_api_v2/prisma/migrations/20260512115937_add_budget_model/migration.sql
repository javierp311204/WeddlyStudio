-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "total_budget" DECIMAL(20,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 0,
    "wedding_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "allocated_amount" DECIMAL(20,2) NOT NULL,
    "spent_amount" DECIMAL(20,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "budget_category_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "notes" TEXT,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_user_id_idx" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "budget_categories_budget_id_idx" ON "budget_categories"("budget_id");

-- CreateIndex
CREATE INDEX "expenses_budget_category_id_idx" ON "expenses"("budget_category_id");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_budget_category_id_fkey" FOREIGN KEY ("budget_category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
