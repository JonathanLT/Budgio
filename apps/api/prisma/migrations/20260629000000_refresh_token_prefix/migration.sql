-- Invalidate all existing refresh tokens (new cookie-based flow is incompatible)
DELETE FROM "RefreshToken";

-- Add fast-lookup prefix column
ALTER TABLE "RefreshToken" ADD COLUMN "tokenPrefix" TEXT NOT NULL;
CREATE UNIQUE INDEX "RefreshToken_tokenPrefix_key" ON "RefreshToken"("tokenPrefix");
