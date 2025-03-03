-- Elimina la funzione esistente se esiste
DROP FUNCTION IF EXISTS public.get_table_columns(text);

-- Funzione per ottenere le colonne di una tabella
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')::boolean
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public' AND
    c.table_name = p_table_name;
END;
$$;

-- Concedi i permessi per eseguire la funzione
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO service_role;

-- Commento sulla funzione
COMMENT ON FUNCTION public.get_table_columns(text) IS 'Restituisce le informazioni sulle colonne di una tabella specificata'; 