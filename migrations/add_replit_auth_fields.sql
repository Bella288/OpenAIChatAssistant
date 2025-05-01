-- This migration script adds the necessary fields for Replit Auth to the users table
-- and converts the existing IDs to text format

-- 1. Create a temporary table with the new schema
CREATE TABLE "users_new" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "email" TEXT UNIQUE,
  "password" TEXT,
  "full_name" TEXT,
  "location" TEXT,
  "interests" TEXT[],
  "profession" TEXT,
  "pets" TEXT,
  "system_context" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "bio" TEXT,
  "profile_image_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- 2. Insert existing users into the new table, converting id to text
INSERT INTO "users_new" (
  "id", "username", "password", "full_name", "location", 
  "interests", "profession", "pets", "system_context"
)
SELECT 
  id::TEXT, "username", "password", "full_name", "location", 
  "interests", "profession", "pets", "system_context"
FROM "users";

-- 3. Create a temporary table for conversations with the new schema
CREATE TABLE "conversations_new" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "personality" TEXT NOT NULL DEFAULT 'default',
  "user_id" TEXT REFERENCES "users_new"("id")
);

-- 4. Copy conversations to the new table
INSERT INTO "conversations_new" (
  "id", "title", "created_at", "personality", "user_id"
)
SELECT 
  "id", "title", "created_at", "personality", 
  CASE WHEN "user_id" IS NOT NULL THEN "user_id"::TEXT ELSE NULL END
FROM "conversations";

-- 5. Drop the old tables
DROP TABLE "conversations";
DROP TABLE "users";

-- 6. Rename the new tables to replace the old ones
ALTER TABLE "users_new" RENAME TO "users";
ALTER TABLE "conversations_new" RENAME TO "conversations";

-- 7. Create the sessions table for Replit Auth if it doesn't exist
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" VARCHAR PRIMARY KEY,
  "sess" JSONB NOT NULL,
  "expire" TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");