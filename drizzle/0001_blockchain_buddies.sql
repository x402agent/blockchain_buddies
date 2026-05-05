CREATE TABLE "blockchain_buddies" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"owner_wallet" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"metadata_uri" text NOT NULL,
	"personality" text,
	"species" text,
	"asset_address" text NOT NULL,
	"mint_signature" text NOT NULL,
	"cluster" text DEFAULT 'solana-mainnet' NOT NULL,
	"rpc_provider" text DEFAULT 'helius' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "blockchain_buddies_owner_idx" ON "blockchain_buddies" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blockchain_buddies_asset_unique" ON "blockchain_buddies" USING btree ("asset_address");--> statement-breakpoint
CREATE INDEX "blockchain_buddies_created_at_idx" ON "blockchain_buddies" USING btree ("created_at");
