-- Adicionar campo polo ao usuário
ALTER TABLE public.users ADD COLUMN polo TEXT;

-- Criar enum para os polos disponíveis
CREATE TYPE polo_type AS ENUM ('3M Sumaré', 'Manaus', 'Ribeirão Preto', 'Itapetininga');

-- Atualizar a coluna para usar o enum
ALTER TABLE public.users ALTER COLUMN polo TYPE polo_type USING polo::polo_type;