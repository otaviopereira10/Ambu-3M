-- Atualizar os dados existentes na tabela requests para usar os novos valores do polo
UPDATE requests 
SET polo = CASE 
  WHEN polo = '3M Sumaré' THEN '3M Sumaré'
  WHEN polo = 'Manaus' THEN '3M Manaus'
  WHEN polo = 'Ribeirão Preto' THEN '3M Ribeirão Preto'
  WHEN polo = 'Itapetininga' THEN '3M Itapetininga'
  ELSE polo
END
WHERE polo IS NOT NULL;