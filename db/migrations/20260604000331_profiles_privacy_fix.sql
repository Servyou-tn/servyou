
-- Migration: profiles_privacy_fix
-- 1. Drop the permissive read policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- 2. Owner-only SELECT policy
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. Public profiles view — safe fields only, readable by everyone
CREATE VIEW public_profiles
  WITH (security_barrier = true, security_invoker = false)
  AS
  SELECT id, full_name, city, language, seller_type
  FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- 4. get_contact_phone — returns target's phone only when a real relationship exists
CREATE OR REPLACE FUNCTION get_contact_phone(target uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_phone  text;
BEGIN
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
$$;

GRANT EXECUTE ON FUNCTION get_contact_phone(uuid) TO authenticated;
