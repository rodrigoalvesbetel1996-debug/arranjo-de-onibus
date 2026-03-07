-- Initial Schema for JW Event Transport Manager
-- WARNING: This script will drop existing tables to recreate them with the correct camelCase schema.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to avoid conflicts with old snake_case schema
DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "sh_reports" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "passengers" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "congregations" CASCADE;

-- Congregations Table
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
    "accessCode" TEXT
);

-- Events Table
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

-- Users Table
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK (role IN ('ADMIN', 'CONGREGATION')),
    "congregationId" TEXT REFERENCES "congregations"("id"),
    "name" TEXT NOT NULL
);

-- Passengers Table
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

-- Payments Table
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

-- SH Reports Table
CREATE TABLE "sh_reports" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id"),
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "answers" JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Expenses Table
CREATE TABLE "expenses" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "eventId" TEXT NOT NULL REFERENCES "events"("id"),
    "description" TEXT NOT NULL,
    "amount" NUMERIC(10, 2) NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE "congregations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passengers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sh_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (Public Access)
-- Note: In a production app, you would restrict this based on auth.uid()
CREATE POLICY "Allow all on congregations" ON "congregations" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON "events" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON "users" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on passengers" ON "passengers" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on payments" ON "payments" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sh_reports" ON "sh_reports" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses" ON "expenses" FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_passengers_congregation ON "passengers"("congregationId");
CREATE INDEX IF NOT EXISTS idx_passengers_event ON "passengers"("eventId");
CREATE INDEX IF NOT EXISTS idx_payments_congregation ON "payments"("congregationId");
CREATE INDEX IF NOT EXISTS idx_payments_event ON "payments"("eventId");
CREATE INDEX IF NOT EXISTS idx_users_congregation ON "users"("congregationId");
