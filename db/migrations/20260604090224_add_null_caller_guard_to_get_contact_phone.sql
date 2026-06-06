
CREATE OR REPLACE FUNCTION public.get_contact_phone(target uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_phone  text;
BEGIN
  IF v_caller IS NULL THEN RETURN NULL; END IF;

  IF v_caller = target THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM orders
    WHERE (buyer_id = v_caller AND seller_id = target)
       OR (seller_id = v_caller AND buyer_id = target)
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM job_responses jr
    JOIN job_posts jp ON jp.id = jr.job_post_id
    WHERE jr.freelancer_id = v_caller
      AND jp.consumer_id = target
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM job_responses jr
    JOIN job_posts jp ON jp.id = jr.job_post_id
    WHERE jr.freelancer_id = target
      AND jp.consumer_id = v_caller
  ) THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = target;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$function$;
