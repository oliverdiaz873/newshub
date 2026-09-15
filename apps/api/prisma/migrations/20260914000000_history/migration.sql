-- CreateTable: polymorphic content revisions (append-only, application-enforced)
CREATE TABLE "revisions" (
  "id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "actor_id" UUID,
  "cause" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- Monotonic version per entity (concurrent writers retry on conflict)
CREATE UNIQUE INDEX "revisions_entity_version_key" ON "revisions"("entity_type", "entity_id", "version");
CREATE INDEX "revisions_entity_version_idx" ON "revisions"("entity_type", "entity_id", "version" DESC);

ALTER TABLE "revisions" ADD CONSTRAINT "revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: immutable audit trail (append-only, no update/delete surface)
CREATE TABLE "audit_events" (
  "id" UUID NOT NULL,
  "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" UUID,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID,
  "metadata" JSONB,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_at_idx" ON "audit_events"("at" DESC);
CREATE INDEX "audit_events_entity_at_idx" ON "audit_events"("entity_type", "entity_id", "at" DESC);

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
