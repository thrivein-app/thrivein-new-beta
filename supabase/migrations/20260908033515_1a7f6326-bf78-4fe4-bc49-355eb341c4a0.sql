ALTER TABLE public.call_action_items DROP CONSTRAINT IF EXISTS call_action_items_kind_check;
ALTER TABLE public.call_action_items ADD CONSTRAINT call_action_items_kind_check
  CHECK (kind = ANY (ARRAY['task'::text,'credit'::text,'note'::text,'followup'::text,'decision'::text,'studio'::text]));

ALTER TABLE public.call_transcripts
  ADD COLUMN IF NOT EXISTS decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kreto_enabled boolean NOT NULL DEFAULT true;