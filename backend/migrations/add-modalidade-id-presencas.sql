-- Migration: add modalidade_id to presencas table
-- This column is required to track which modalidade each check-in belongs to

ALTER TABLE teamcruz.presencas
  ADD COLUMN IF NOT EXISTS modalidade_id uuid NULL;

-- Optional FK (nullable, so existing rows are not affected)
ALTER TABLE teamcruz.presencas
  ADD CONSTRAINT IF NOT EXISTS fk_presencas_modalidade
    FOREIGN KEY (modalidade_id) REFERENCES teamcruz.modalidades(id) ON DELETE SET NULL;

-- Index for filtering presencas by modalidade
CREATE INDEX IF NOT EXISTS idx_presencas_modalidade_id
  ON teamcruz.presencas USING btree (modalidade_id);
