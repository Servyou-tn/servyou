
-- Fairness-limit guard for job_responses.
-- Constants mirror src/lib/job-constants.ts — update both together.
CREATE OR REPLACE FUNCTION check_job_response_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post         job_posts%ROWTYPE;
  v_response_cnt integer;
  v_active_cnt   integer;
BEGIN
  SELECT * INTO v_post FROM job_posts WHERE id = NEW.job_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annonce introuvable.';
  END IF;

  -- Post must be open
  IF v_post.status != 'open' THEN
    RAISE EXCEPTION 'Cette annonce n''est plus ouverte.';
  END IF;

  -- Post must not be expired (30 days)
  IF v_post.created_at < (now() - interval '30 days') THEN
    RAISE EXCEPTION 'Cette annonce a expiré.';
  END IF;

  -- No self-response
  IF NEW.freelancer_id = v_post.consumer_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas répondre à votre propre annonce.';
  END IF;

  -- Duplicate check (friendly error before UNIQUE constraint fires)
  IF EXISTS (
    SELECT 1 FROM job_responses
    WHERE job_post_id = NEW.job_post_id AND freelancer_id = NEW.freelancer_id
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà répondu à cette annonce.';
  END IF;

  -- Max 10 responses per post
  SELECT count(*) INTO v_response_cnt
  FROM job_responses
  WHERE job_post_id = NEW.job_post_id;

  IF v_response_cnt >= 10 THEN
    RAISE EXCEPTION 'Cette annonce a atteint le nombre maximum de réponses (10).';
  END IF;

  -- Max 5 active responses per freelancer
  -- Active = response whose post is still open AND not past expiry
  SELECT count(*) INTO v_active_cnt
  FROM job_responses jr
  JOIN job_posts jp ON jp.id = jr.job_post_id
  WHERE jr.freelancer_id = NEW.freelancer_id
    AND jp.status = 'open'
    AND jp.created_at >= (now() - interval '30 days');

  IF v_active_cnt >= 5 THEN
    RAISE EXCEPTION 'Vous avez atteint le nombre maximum de réponses actives (5).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_job_response_limits ON job_responses;

CREATE TRIGGER trg_check_job_response_limits
  BEFORE INSERT ON job_responses
  FOR EACH ROW EXECUTE FUNCTION check_job_response_limits();
