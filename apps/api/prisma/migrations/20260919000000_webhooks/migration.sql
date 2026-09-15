-- Increment 10: outbound webhooks (admin-managed) + delivery log.
CREATE TABLE "webhooks" (
  "id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "secret_hash" TEXT NOT NULL,
  "events" TEXT[] NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "webhook_deliveries" (
  "id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimed_at" TIMESTAMPTZ,
  "payload" JSONB,
  "response_code" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_status_check" CHECK ("status" IN ('pending', 'inflight', 'delivered', 'failed'));
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_action_check" CHECK ("action" IN ('published', 'unpublished'));

CREATE UNIQUE INDEX "webhook_deliveries_subscription_entity_action_key" ON "webhook_deliveries"("subscription_id", "entity_type", "entity_id", "action");
CREATE INDEX "webhook_deliveries_status_next_idx" ON "webhook_deliveries"("status", "next_attempt_at");
CREATE INDEX "webhook_deliveries_subscription_created_idx" ON "webhook_deliveries"("subscription_id", "created_at" DESC);

ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
