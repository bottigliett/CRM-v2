-- CreateTable
CREATE TABLE "client_access" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contact_id" INTEGER NOT NULL,
    "access_type" TEXT NOT NULL DEFAULT 'QUOTE_ONLY',
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "activation_token" TEXT,
    "activation_expires" DATETIME,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "project_name" TEXT,
    "project_description" TEXT,
    "project_budget" REAL,
    "project_start_date" DATETIME,
    "project_end_date" DATETIME,
    "monthly_fee" REAL DEFAULT 0,
    "support_hours_included" REAL NOT NULL DEFAULT 0,
    "support_hours_used" REAL NOT NULL DEFAULT 0,
    "drive_folder_link" TEXT,
    "documents_folder" TEXT,
    "assets_folder" TEXT,
    "invoice_folder" TEXT,
    "bespoke_details" TEXT,
    "linked_quote_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "last_login" DATETIME,
    CONSTRAINT "client_access_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_access_linked_quote_id_fkey" FOREIGN KEY ("linked_quote_id") REFERENCES "quotes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quote_number" TEXT NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subtotal" REAL NOT NULL,
    "discount_amount" REAL NOT NULL DEFAULT 0,
    "tax_rate" REAL NOT NULL DEFAULT 22,
    "total" REAL NOT NULL,
    "one_time_discount" REAL NOT NULL DEFAULT 0,
    "payment_2_discount" REAL NOT NULL DEFAULT 0,
    "payment_3_discount" REAL NOT NULL DEFAULT 0,
    "payment_4_discount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "valid_until" DATETIME NOT NULL,
    "accepted_date" DATETIME,
    "rejected_date" DATETIME,
    "selected_package_id" INTEGER,
    "selected_payment_option" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "quotes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quote_id" INTEGER NOT NULL,
    "package_id" INTEGER,
    "item_name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL,
    "total" REAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quote_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "quote_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_packages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quote_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "quote_packages_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_access_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "related_id" INTEGER,
    "related_type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_notifications_client_access_id_fkey" FOREIGN KEY ("client_access_id") REFERENCES "client_access" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_number" TEXT NOT NULL,
    "client_access_id" INTEGER NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "support_type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to" INTEGER,
    "time_spent_minutes" INTEGER NOT NULL DEFAULT 0,
    "closing_notes" TEXT,
    "closed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tickets_client_access_id_fkey" FOREIGN KEY ("client_access_id") REFERENCES "client_access" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "client_access_id" INTEGER,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "client_read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_messages_client_access_id_fkey" FOREIGN KEY ("client_access_id") REFERENCES "client_access" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_activity_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "client_access_id" INTEGER,
    "action" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_activity_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_activity_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_access_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_activity_logs_client_access_id_fkey" FOREIGN KEY ("client_access_id") REFERENCES "client_access" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_number" TEXT NOT NULL,
    "contact_id" INTEGER,
    "client_name" TEXT NOT NULL,
    "client_address" TEXT,
    "client_piva" TEXT,
    "client_cf" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "quote_id" INTEGER,
    "quantity" REAL NOT NULL DEFAULT 1.00,
    "unit_price" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "vat_percentage" REAL NOT NULL DEFAULT 0,
    "vat_amount" REAL NOT NULL,
    "total" REAL NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "payment_days" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payment_date" DATETIME,
    "payment_method" TEXT,
    "payment_notes" TEXT,
    "tax_reserved" BOOLEAN NOT NULL DEFAULT false,
    "tax_amount" REAL,
    "fiscal_notes" TEXT,
    "pdf_path" TEXT,
    "pdf_generated_at" DATETIME,
    "visible_to_client" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("client_address", "client_cf", "client_name", "client_piva", "contact_id", "created_at", "created_by", "description", "due_date", "fiscal_notes", "id", "invoice_number", "issue_date", "payment_date", "payment_days", "payment_method", "payment_notes", "pdf_generated_at", "pdf_path", "quantity", "quote_id", "status", "subject", "subtotal", "tax_amount", "tax_reserved", "total", "unit_price", "updated_at", "vat_amount", "vat_percentage") SELECT "client_address", "client_cf", "client_name", "client_piva", "contact_id", "created_at", "created_by", "description", "due_date", "fiscal_notes", "id", "invoice_number", "issue_date", "payment_date", "payment_days", "payment_method", "payment_notes", "pdf_generated_at", "pdf_path", "quantity", "quote_id", "status", "subject", "subtotal", "tax_amount", "tax_reserved", "total", "unit_price", "updated_at", "vat_amount", "vat_percentage" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");
CREATE INDEX "invoices_contact_id_idx" ON "invoices"("contact_id");
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_created_by_idx" ON "invoices"("created_by");
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "client_access_contact_id_key" ON "client_access"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_access_username_key" ON "client_access"("username");

-- CreateIndex
CREATE UNIQUE INDEX "client_access_activation_token_key" ON "client_access"("activation_token");

-- CreateIndex
CREATE INDEX "client_access_contact_id_idx" ON "client_access"("contact_id");

-- CreateIndex
CREATE INDEX "client_access_username_idx" ON "client_access"("username");

-- CreateIndex
CREATE INDEX "client_access_activation_token_idx" ON "client_access"("activation_token");

-- CreateIndex
CREATE INDEX "client_access_access_type_idx" ON "client_access"("access_type");

-- CreateIndex
CREATE INDEX "client_access_linked_quote_id_idx" ON "client_access"("linked_quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "quotes_contact_id_idx" ON "quotes"("contact_id");

-- CreateIndex
CREATE INDEX "quotes_quote_number_idx" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_created_by_idx" ON "quotes"("created_by");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");

-- CreateIndex
CREATE INDEX "quote_items_package_id_idx" ON "quote_items"("package_id");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_order_idx" ON "quote_items"("quote_id", "order");

-- CreateIndex
CREATE INDEX "quote_packages_quote_id_idx" ON "quote_packages"("quote_id");

-- CreateIndex
CREATE INDEX "quote_packages_quote_id_order_idx" ON "quote_packages"("quote_id", "order");

-- CreateIndex
CREATE INDEX "client_notifications_client_access_id_idx" ON "client_notifications"("client_access_id");

-- CreateIndex
CREATE INDEX "client_notifications_client_access_id_is_read_idx" ON "client_notifications"("client_access_id", "is_read");

-- CreateIndex
CREATE INDEX "client_notifications_created_at_idx" ON "client_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_client_access_id_idx" ON "tickets"("client_access_id");

-- CreateIndex
CREATE INDEX "tickets_contact_id_idx" ON "tickets"("contact_id");

-- CreateIndex
CREATE INDEX "tickets_ticket_number_idx" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_idx" ON "tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_user_id_idx" ON "ticket_messages"("user_id");

-- CreateIndex
CREATE INDEX "ticket_messages_client_access_id_idx" ON "ticket_messages"("client_access_id");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_created_at_idx" ON "ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_activity_logs_ticket_id_idx" ON "ticket_activity_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_activity_logs_user_id_idx" ON "ticket_activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "ticket_activity_logs_client_access_id_idx" ON "ticket_activity_logs"("client_access_id");

-- CreateIndex
CREATE INDEX "ticket_activity_logs_created_at_idx" ON "ticket_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "client_activity_logs_client_access_id_idx" ON "client_activity_logs"("client_access_id");

-- CreateIndex
CREATE INDEX "client_activity_logs_created_at_idx" ON "client_activity_logs"("created_at");
