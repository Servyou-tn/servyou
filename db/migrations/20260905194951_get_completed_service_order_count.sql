-- Public trust-metric aggregate for D4 (/freelance/[id]). orders' own SELECT RLS is
-- buyer/seller-scoped ("Buyer and seller read their orders"), so a stranger browsing a
-- freelancer's public profile reads zero rows directly. This SECURITY DEFINER function
-- bridges that gap with a bare integer -- no row data -- mirroring get_contact_phone's
-- guard shape (STABLE SECURITY DEFINER, SET search_path TO 'public').
--
-- Unlike get_contact_phone, there is no caller-identity branch: the count is not
-- viewer-dependent, so there is nothing to guard a null caller against. Same grant
-- shape as get_contact_phone too -- GRANT to authenticated explicitly, and the default
-- PUBLIC execute grant from CREATE FUNCTION is left un-revoked, so anon can call it and
-- get a real number (this is public trust data, not PII).
CREATE OR REPLACE FUNCTION public.get_completed_service_order_count(target uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM orders
  WHERE seller_id = target
    AND order_type = 'service'
    AND status = 'received';

  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_completed_service_order_count(uuid) TO authenticated;
