-- Verifica della struttura della tabella results
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'results';

-- Esempio di record nella tabella results (limita a 1 record)
SELECT * FROM results LIMIT 1;

-- Verifica se la tabella ha RLS abilitato
SELECT 
  t.table_name, 
  obj_description(tbl.oid) as comment,
  t.row_security
FROM information_schema.tables t
JOIN pg_class tbl ON tbl.relname = t.table_name
WHERE t.table_schema = 'public' 
AND t.table_name = 'results'; 