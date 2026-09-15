-- Increment 8: planning items (pitches + assignments, single polymorphic table).
CREATE TABLE "planning_items" (
  "id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category_id" UUID,
  "assignee_id" UUID,
  "reviewer_id" UUID,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'pitched',
  "due_at" TIMESTAMPTZ,
  "entity_type" TEXT,
  "entity_id" UUID,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "planning_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_type_check" CHECK ("type" IN ('pitch', 'assignment'));
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_priority_check" CHECK ("priority" IN ('low', 'normal', 'high'));
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_status_check" CHECK ("status" IN ('pitched', 'assigned', 'in-progress', 'in-review', 'done', 'cancelled'));

CREATE INDEX "planning_items_assignee_status_due_idx" ON "planning_items"("assignee_id", "status", "due_at");
CREATE INDEX "planning_items_status_due_idx" ON "planning_items"("status", "due_at");
CREATE INDEX "planning_items_due_idx" ON "planning_items"("due_at");

ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planning_items" ADD CONSTRAINT "planning_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
