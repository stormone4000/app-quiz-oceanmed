-- Funzione per ottenere i video pubblici per gli studenti
CREATE OR REPLACE FUNCTION public.get_student_videos()
RETURNS TABLE (
  category_id uuid,
  category_title text,
  category_icon text,
  category_icon_color text,
  category_publish_date timestamp with time zone,
  video_id uuid,
  video_title text,
  video_embed_url text,
  video_publish_date timestamp with time zone
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Restituisci tutte le categorie e i video pubblici associati
  RETURN QUERY
  SELECT 
    vc.id as category_id,
    vc.title as category_title,
    vc.icon as category_icon,
    vc.icon_color as category_icon_color,
    vc.publish_date as category_publish_date,
    v.id as video_id,
    v.title as video_title,
    v.embed_url as video_embed_url,
    v.publish_date as video_publish_date
  FROM 
    video_categories vc
  LEFT JOIN 
    videos v ON v.category_id = vc.id
  WHERE
    vc.is_public = true AND (v.id IS NULL OR v.is_public = true)
  ORDER BY 
    vc.publish_date DESC, v.publish_date DESC;
END;
$$;

-- Concedi i permessi di esecuzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.get_student_videos() TO authenticated; 