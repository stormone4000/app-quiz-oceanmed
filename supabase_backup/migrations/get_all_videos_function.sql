-- Funzione per ottenere tutte le categorie video e i video associati
CREATE OR REPLACE FUNCTION get_all_videos()
RETURNS TABLE (
  category_id UUID,
  category_title TEXT,
  category_icon TEXT,
  category_icon_color TEXT,
  category_publish_date TIMESTAMPTZ,
  video_id UUID,
  video_title TEXT,
  video_embed_url TEXT,
  video_publish_date TIMESTAMPTZ
) AS $$
BEGIN
  -- Verifica che l'utente corrente sia un amministratore o un istruttore
  IF NOT (
    (SELECT (raw_app_meta_data->>'is_master')::boolean FROM auth.users WHERE id = auth.uid()) OR
    (SELECT (raw_app_meta_data->>'is_instructor')::boolean FROM auth.users WHERE id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Solo gli amministratori e gli istruttori possono accedere a questi dati';
  END IF;
  
  -- Restituisci i dati delle categorie video e dei video associati
  RETURN QUERY
  SELECT 
    vc.id AS category_id,
    vc.title AS category_title,
    vc.icon AS category_icon,
    vc.icon_color AS category_icon_color,
    vc.publish_date AS category_publish_date,
    v.id AS video_id,
    v.title AS video_title,
    v.embed_url AS video_embed_url,
    v.publish_date AS video_publish_date
  FROM video_categories vc
  LEFT JOIN videos v ON v.category_id = vc.id
  ORDER BY vc.publish_date DESC, v.publish_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concedi i permessi di esecuzione
GRANT EXECUTE ON FUNCTION get_all_videos() TO authenticated; 