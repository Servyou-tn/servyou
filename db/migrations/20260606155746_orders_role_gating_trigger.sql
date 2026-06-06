CREATE OR REPLACE FUNCTION public.check_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller      uuid := auth.uid();
  v_caller_role text;
BEGIN
  -- Admin override: data fixes always allowed
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-status edits sail through (buyer_note, delivery_phone, etc.)
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Resolve caller role on this order
  IF v_caller = OLD.buyer_id THEN
    v_caller_role := 'buyer';
  ELSIF v_caller = OLD.seller_id THEN
    v_caller_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Vous n''êtes pas autorisé à modifier cette commande.';
  END IF;

  -- Terminal states cannot be transitioned out of
  IF OLD.status IN ('received', 'cancelled') THEN
    RAISE EXCEPTION 'Cette commande est terminée et ne peut plus être modifiée.';
  END IF;

  -- Cancellation path
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by IS NULL THEN
      RAISE EXCEPTION 'L''annulation doit indiquer son auteur.';
    END IF;
    IF NEW.cancelled_by <> v_caller_role THEN
      RAISE EXCEPTION 'cancelled_by doit correspondre à votre rôle (% attendu).', v_caller_role;
    END IF;
    -- Post-pivot cancellation requires a reason
    IF OLD.order_type = 'product'
       AND OLD.status IN ('dispatched', 'in_delivery', 'arrived')
       AND (NEW.cancellation_reason IS NULL OR btrim(NEW.cancellation_reason) = '') THEN
      RAISE EXCEPTION 'Une raison d''annulation est requise après l''expédition.';
    END IF;
    IF OLD.order_type = 'service'
       AND OLD.status IN ('accepted', 'arrived')
       AND (NEW.cancellation_reason IS NULL OR btrim(NEW.cancellation_reason) = '') THEN
      RAISE EXCEPTION 'Une raison d''annulation est requise après l''acceptation.';
    END IF;
    RETURN NEW;
  END IF;

  -- Buyer-only: received (from arrived)
  IF NEW.status = 'received' THEN
    IF v_caller_role <> 'buyer' THEN
      RAISE EXCEPTION 'Seul l''acheteur peut confirmer la réception.';
    END IF;
    IF OLD.status <> 'arrived' THEN
      RAISE EXCEPTION 'La réception ne peut être confirmée qu''après l''arrivée.';
    END IF;
    RETURN NEW;
  END IF;

  -- All remaining transitions are seller-only chain advancement
  IF v_caller_role <> 'seller' THEN
    RAISE EXCEPTION 'Seul le vendeur peut faire avancer la commande.';
  END IF;

  -- Per-order-type adjacent-transition validation
  IF OLD.order_type = 'product' THEN
    IF NOT (
      (OLD.status = 'pending'     AND NEW.status = 'accepted')    OR
      (OLD.status = 'accepted'    AND NEW.status = 'prepared')    OR
      (OLD.status = 'prepared'    AND NEW.status = 'dispatched')  OR
      (OLD.status = 'dispatched'  AND NEW.status = 'in_delivery') OR
      (OLD.status = 'in_delivery' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande produit: % → %.',
        OLD.status, NEW.status;
    END IF;
  ELSIF OLD.order_type = 'service' THEN
    IF NOT (
      (OLD.status = 'pending'  AND NEW.status = 'accepted') OR
      (OLD.status = 'accepted' AND NEW.status = 'arrived')
    ) THEN
      RAISE EXCEPTION 'Transition invalide pour une commande service: % → %.',
        OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_check_order_status_transition
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION check_order_status_transition();
