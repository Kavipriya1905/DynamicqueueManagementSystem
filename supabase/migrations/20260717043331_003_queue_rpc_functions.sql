/*
# Queue RPC functions

## Purpose
Atomic server-side operations for booking tokens and advancing the
queue, plus admin helpers. These run as SECURITY DEFINER so they can
update the `services.next_number` counter and transition token
statuses atomically, avoiding race conditions when many users book at
once.

## Functions
1. `book_token(p_service_id uuid)` — atomically reserves the next
   ticket number for the given service and inserts a `waiting` token
   owned by the caller (`auth.uid()`). Returns the new token row.
   Raises if the service is missing or inactive.
2. `call_next_token(p_service_id uuid)` — admin only. Completes any
   currently `serving` token for the service, then promotes the
   lowest-numbered `waiting` token to `serving` (sets `called_at`).
   Returns the newly serving token (or NULL if the queue is empty).
   Raises if the caller is not an admin.

## Grants
- EXECUTE on both functions granted to `authenticated`.

## Security
- `book_token` uses `auth.uid()` for ownership (caller's JWT), so even
  though the function runs as DEFINER, the token is always owned by
  the requesting user.
- `call_next_token` checks `public.is_admin()` (which inspects the
  caller's JWT role claim) and raises if not an admin.
*/

-- ------------------------------------------------------------------
-- book_token
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_token(p_service_id uuid)
RETURNS public.tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.tokens;
  v_number integer;
  v_active boolean;
BEGIN
  SELECT is_active, next_number INTO v_active, v_number
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'Service is not currently accepting bookings';
  END IF;

  UPDATE public.services
    SET next_number = next_number + 1, updated_at = now()
    WHERE id = p_service_id;

  INSERT INTO public.tokens (service_id, user_id, number, status)
  VALUES (p_service_id, auth.uid(), v_number, 'waiting')
  RETURNING * INTO v_token;

  RETURN v_token;
END;
$$;

-- ------------------------------------------------------------------
-- call_next_token
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.call_next_token(p_service_id uuid)
RETURNS public.tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.tokens;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can call the next token';
  END IF;

  -- Complete any currently serving token for this service.
  UPDATE public.tokens
    SET status = 'completed', completed_at = now()
    WHERE service_id = p_service_id AND status = 'serving';

  -- Promote the lowest-numbered waiting token.
  UPDATE public.tokens
    SET status = 'serving', called_at = now()
    WHERE id = (
      SELECT id FROM public.tokens
      WHERE service_id = p_service_id AND status = 'waiting'
      ORDER BY number ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.call_next_token(uuid) TO authenticated;
