-- =====================================================================================
-- SCRIPT DE MIGRAÇÃO COMPLETA PARA O SUPABASE - JW EVENT TRANSPORT MANAGER
-- =====================================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://app.supabase.com)
-- 2. Vá para o menu "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "New query"
-- 4. Cole TODO este código e clique em "Run" (ou pressione Cmd/Ctrl + Enter)
-- =====================================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Limpar tabelas existentes (CUIDADO: Isso apagará todos os dados atuais do banco)
-- Remova ou comente estas linhas se quiser preservar os dados e apenas atualizar a estrutura
DROP TABLE IF EXISTS "expenses" CASCADE;
DROP TABLE IF EXISTS "sh_reports" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "passengers" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;
DROP TABLE IF EXISTS "congregation_access_codes" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "congregations" CASCADE;

-- =====================================================================================
-- CRIAÇÃO DAS TABELAS
-- =====================================================================================

-- Tabela de Congregações
CREATE TABLE "congregations" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "passengersTotal" INTEGER DEFAULT 0,
    "ticketsPurchased" INTEGER DEFAULT 0,
    "coordinatorName" TEXT,
    "circuit" TEXT,
    "cityState" TEXT,
    "phone" TEXT,
    "lastUpdated" TEXT,
    "isPaidConfirmed" BOOLEAN DEFAULT FALSE,
    "accessCode" TEXT
);

-- Tabela de Códigos de Acesso das Congregações
CREATE TABLE "congregation_access_codes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "congregationId" TEXT UNIQUE REFERENCES "congregations"("id") ON DELETE CASCADE,
    "code" TEXT UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Eventos
CREATE TABLE "events" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1,
    "pricePerTicket" NUMERIC(10, 2) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "paymentDeadline" TEXT,
    "registrationDeadline" TEXT,
    "info" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT
);

-- Tabela de Perfis de Usuário (Vinculada ao Supabase Auth)
CREATE TABLE "profiles" (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT CHECK ("role" IN ('ADMIN', 'CONGREGATION')) DEFAULT 'CONGREGATION',
    "congregationId" TEXT REFERENCES "congregations"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Passageiros
CREATE TABLE "passengers" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "groupId" TEXT NOT NULL,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id") ON DELETE CASCADE,
    "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
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

-- Tabela de Pagamentos
CREATE TABLE "payments" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id") ON DELETE CASCADE,
    "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "payerName" TEXT NOT NULL,
    "amount" NUMERIC(10, 2) NOT NULL,
    "appliedAmount" NUMERIC(10, 2) DEFAULT 0,
    "excessAmount" NUMERIC(10, 2) DEFAULT 0,
    "excessTreatment" TEXT,
    "justification" TEXT,
    "excessDocUrl" TEXT,
    "date" TEXT,
    "imageUrl" TEXT,
    "imageUrls" JSONB DEFAULT '[]'::jsonb,
    "status" TEXT DEFAULT 'PENDING',
    "observation" TEXT
);

-- Tabela de Relatórios de Serviço de Honra (SH)
CREATE TABLE "sh_reports" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "congregationId" TEXT NOT NULL REFERENCES "congregations"("id") ON DELETE CASCADE,
    "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "date" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Tabela de Despesas
CREATE TABLE "expenses" (
    "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    "eventId" TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "amount" NUMERIC(10, 2) NOT NULL,
    "date" TEXT
);

-- =====================================================================================
-- CONFIGURAÇÃO DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- =====================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE "congregations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "congregation_access_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passengers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sh_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Público (Permitir tudo para usuários autenticados)
-- Nota: Em um ambiente de produção rigoroso, você limitaria isso por "role" ou "congregationId".
-- Para o funcionamento atual do app (que filtra no frontend), permitimos acesso total a usuários logados.

CREATE POLICY "Enable all access for authenticated users" ON "congregations" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "congregation_access_codes" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "events" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "profiles" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "passengers" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "payments" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "sh_reports" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON "expenses" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_pass_cong ON "passengers"("congregationId");
CREATE INDEX IF NOT EXISTS idx_pass_event ON "passengers"("eventId");
CREATE INDEX IF NOT EXISTS idx_pay_cong ON "payments"("congregationId");
CREATE INDEX IF NOT EXISTS idx_prof_cong ON "profiles"("congregationId");

-- =====================================================================================
-- TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIL (Opcional, mas recomendado)
-- =====================================================================================
-- Cria um perfil automaticamente quando um usuário se cadastra via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE(new.raw_user_meta_data->>'role', 'CONGREGATION')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
