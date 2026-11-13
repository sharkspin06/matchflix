-- Supabase exposes the public schema through its API using the public key.
-- With no policies, this blocks that access; the backend connects as the table owner and is unaffected.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "passes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
