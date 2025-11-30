-- Adicionar campos de geolocalização às unidades
-- Executar este SQL no banco de dados

-- Adicionar latitude e longitude às unidades
ALTER TABLE teamcruz.unidades
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Comentários
COMMENT ON COLUMN teamcruz.unidades.latitude IS 'Latitude da localização da unidade (graus decimais)';
COMMENT ON COLUMN teamcruz.unidades.longitude IS 'Longitude da localização da unidade (graus decimais)';

-- Exemplo de como atualizar com coordenadas (substitua pelos valores reais):
-- UPDATE teamcruz.unidades SET latitude = -23.550520, longitude = -46.633308 WHERE id = 'id-da-unidade';
