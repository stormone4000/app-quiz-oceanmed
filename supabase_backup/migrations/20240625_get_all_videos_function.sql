-- Funzione per ottenere tutti i video e le categorie, bypassando le policy RLS
CREATE OR REPLACE FUNCTION public.get_all_videos()
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
DECLARE
  is_admin boolean;
  is_instructor boolean;
BEGIN
  -- Verifica se l'utente è un amministratore o un istruttore
  SELECT 
    coalesce(auth.jwt() ->> 'app_metadata'::text, '{}')::jsonb -> 'is_master' = 'true'::jsonb,
    coalesce(auth.jwt() ->> 'app_metadata'::text, '{}')::jsonb -> 'is_instructor' = 'true'::jsonb
  INTO is_admin, is_instructor;
  
  -- Log per debug
  RAISE NOTICE 'User is admin: %, User is instructor: %', is_admin, is_instructor;
  
  -- Solo gli amministratori e gli istruttori possono accedere a questa funzione
  IF NOT (is_admin OR is_instructor) THEN
    RAISE EXCEPTION 'Accesso non autorizzato: solo amministratori e istruttori possono visualizzare tutti i video';
  END IF;
  
  -- Restituisci tutte le categorie e i video associati
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
  ORDER BY 
    vc.publish_date DESC, v.publish_date DESC;
END;
$$;

-- Concedi i permessi di esecuzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.get_all_videos() TO authenticated; 