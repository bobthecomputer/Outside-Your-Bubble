-- Add nationality column for user geodiversity personalization
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationality" TEXT;

-- Store reflection prompts alongside summaries for on-card prompts
ALTER TABLE "Summary" ADD COLUMN IF NOT EXISTS "reflectionPrompt" TEXT;
