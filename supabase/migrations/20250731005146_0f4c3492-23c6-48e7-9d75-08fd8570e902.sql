-- Add dependents field to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS dependents JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the new field
COMMENT ON COLUMN public.requests.dependents IS 'Array of dependent information: [{"name": "Nome do Dependente", "relationship": "Filho/Filha"}]';