-- Checkpoint audit H1#4: single-column indexes for planning list predicates
-- (reviewer queue scoping, category/type filters).
CREATE INDEX "planning_items_reviewer_idx" ON "planning_items"("reviewer_id");
CREATE INDEX "planning_items_category_idx" ON "planning_items"("category_id");
CREATE INDEX "planning_items_type_idx" ON "planning_items"("type");
