-- CreateTable
CREATE TABLE "daily_todos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "weekly_todos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    "week_start" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "task_phases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" DATETIME,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "daily_todos_user_id_idx" ON "daily_todos"("user_id");

-- CreateIndex
CREATE INDEX "daily_todos_user_id_date_idx" ON "daily_todos"("user_id", "date");

-- CreateIndex
CREATE INDEX "daily_todos_date_completed_idx" ON "daily_todos"("date", "completed");

-- CreateIndex
CREATE INDEX "weekly_todos_user_id_idx" ON "weekly_todos"("user_id");

-- CreateIndex
CREATE INDEX "weekly_todos_user_id_week_start_idx" ON "weekly_todos"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "weekly_todos_week_start_completed_idx" ON "weekly_todos"("week_start", "completed");

-- CreateIndex
CREATE INDEX "task_phases_task_id_idx" ON "task_phases"("task_id");

-- CreateIndex
CREATE INDEX "task_phases_user_id_idx" ON "task_phases"("user_id");

-- CreateIndex
CREATE INDEX "task_phases_task_id_order_idx" ON "task_phases"("task_id", "order");
