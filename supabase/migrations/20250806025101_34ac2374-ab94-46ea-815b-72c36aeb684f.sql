-- Atualizar o enum polo_type para incluir os novos valores
ALTER TYPE polo_type RENAME TO polo_type_old;

CREATE TYPE polo_type AS ENUM (
  '3M Sumaré',
  '3M Manaus', 
  '3M Ribeirão Preto',
  '3M Itapetininga'
);

-- Atualizar a coluna polo na tabela users para usar o novo enum
ALTER TABLE users 
  ALTER COLUMN polo TYPE polo_type USING 
  CASE 
    WHEN polo::text = '3M Sumaré' THEN '3M Sumaré'::polo_type
    WHEN polo::text = 'Manaus' THEN '3M Manaus'::polo_type
    WHEN polo::text = 'Ribeirão Preto' THEN '3M Ribeirão Preto'::polo_type  
    WHEN polo::text = 'Itapetininga' THEN '3M Itapetininga'::polo_type
    ELSE NULL
  END;

-- Remover o enum antigo
DROP TYPE polo_type_old;