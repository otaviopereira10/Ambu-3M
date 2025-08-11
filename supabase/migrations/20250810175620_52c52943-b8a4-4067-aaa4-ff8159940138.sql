-- Add missing foreign keys safely if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.requests
    ADD CONSTRAINT requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_request_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_request_id_fkey
    FOREIGN KEY (request_id)
    REFERENCES public.requests(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_request_id_fkey'
  ) THEN
    ALTER TABLE public.comments
    ADD CONSTRAINT comments_request_id_fkey
    FOREIGN KEY (request_id)
    REFERENCES public.requests(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;
  END IF;
END $$;