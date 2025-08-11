-- Update the request_type enum to use the new values
DROP TYPE IF EXISTS request_type CASCADE;
CREATE TYPE request_type AS ENUM ('alimentacao', 'medicamentos', 'transporte', 'educacao', 'outros');

-- Update the requests table to use the new enum
ALTER TABLE public.requests ALTER COLUMN type TYPE request_type USING type::text::request_type;