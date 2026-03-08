-- Initial Schema for JW Event Transport Manager
-- This script sets up the database structure compatible with Supabase Auth and the App's camelCase models.

-- 1. Extensions and Cleanup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "sh_reports" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "passengers" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "congregation_access_codes" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE; -- Old manual users table
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "congregations" CASCADE;

-- 2. Congregations Table
CREATE TABLE "congregations" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "passengersTotal" INTEGER DEFAULT 0,
    "ticketsPurchased" INTEGER DEFAULT 0,
    "coordinatorName" TEXT,
    "circuit" TEXT,
    "cityState" TEXT,
    "phone" TEXT,
    "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "isPaidConfirmed" BOOLEAN DEFAULT FALSE,
    "accessCode" TEXT -- Kept for fast reading compatibility
);

-- 3. Access Codes Table (Extra Security)
CREATE TABLE "congregation_access_codes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "congregationId" TEXT UNIQUE REFERENCES "congregations"("id") ON DELETE CASCADE,
    "code" TEXT UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Events Table
CREATE TABLE "events" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1,
    "pricePerTicket" NUMERIC(10, 2) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "paymentDeadline" DATE,
    "registrationDeadline" DATE,
    "info" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT
);

-- 5. Profiles Table (Linked to Supabase Auth)
CREATE TABLE "profiles" (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT CHECK ("role" IN ('ADMIN', 'CONGREGATION')) DEFAULT 'CONGREGATION',
    "congregationId" TEXT REFERENCES "congregations"("id"),
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Passengers Table
CREATE TABLE "passengers" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "groupId" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id"),
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "mobile" TEXT,
    "payerName" TEXT NOT NULL,
    "isPayer" BOOLEAN DEFAULT FALSE,
    "accommodationType" TEXT NOT NULL,
    "sitsOnLap" BOOLEAN DEFAULT FALSE,
    "travelingWithParent" BOOLEAN DEFAULT FALSE,
    "isUnaccompaniedMinor" BOOLEAN DEFAULT FALSE,
    "termOfResponsibilityUrl" TEXT,
    "status" TEXT DEFAULT 'PENDING',
    "selectedDays" JSONB DEFAULT '[]'::jsonb
);

-- 7. Payments Table
CREATE TABLE "payments" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id"),
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "payerName" TEXT NOT NULL,
    "amount" NUMERIC(10, 2) NOT NULL,
    "appliedAmount" NUMERIC(10, 2) DEFAULT 0,
    "excessAmount" NUMERIC(10, 2) DEFAULT 0,
    "excessTreatment" TEXT,
    "justification" TEXT,
    "excessDocUrl" TEXT,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "imageUrl" TEXT,
    "imageUrls" JSONB DEFAULT '[]'::jsonb,
    "status" TEXT DEFAULT 'PENDING',
    "observation" TEXT
);

-- 8. SH Reports Table
CREATE TABLE "sh_reports" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id"),
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "answers" JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 9. Expenses Table
CREATE TABLE "expenses" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "description" TEXT NOT NULL,
    "amount" NUMERIC(10, 2) NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Security (RLS)
ALTER TABLE "congregations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "congregation_access_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passengers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sh_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;

-- Public Access Policies (For development/testing)
CREATE POLICY "Public Access" ON "congregations" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "congregation_access_codes" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "events" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "profiles" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "passengers" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "payments" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "sh_reports" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON "expenses" FOR ALL USING (true) WITH CHECK (true);

-- Performance Indexes
CREATE INDEX idx_pass_cong ON "passengers"("congregationId");
CREATE INDEX idx_pass_event ON "passengers"("eventId");
CREATE INDEX idx_pay_cong ON "payments"("congregationId");
CREATE INDEX idx_prof_cong ON "profiles"("congregationId");
