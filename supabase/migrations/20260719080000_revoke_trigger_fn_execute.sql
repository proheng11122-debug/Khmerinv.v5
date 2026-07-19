/*
# Fix "SECURITY DEFINER function executable by anon/authenticated"

## Problem
`sync_invoice_paid_amount()` is a SECURITY DEFINER trigger function — it's
only ever meant to run automatically via `trg_sync_invoice_paid_amount` on
`invoice_payments`, using the trigger's implicit NEW/OLD row context.

By default Postgres grants EXECUTE on every new function to PUBLIC, which
in Supabase means the `anon` and `authenticated` API roles can also call it
directly over `/rest/v1/rpc/sync_invoice_paid_amount`. Called directly like
that it can't do anything useful (there's no NEW/OLD outside a trigger), but
the security linter still (rightly) flags exposing a SECURITY DEFINER
function to public API roles as a warning, since it runs with elevated
privileges.

## Fix
Revoke direct EXECUTE from `anon` and `authenticated`. Triggers do not need
an explicit EXECUTE grant to invoke the function, so this does not affect
`paid_amount` / invoice status syncing at all — it only blocks the
functions being called directly as an RPC endpoint.

## Important Notes
- Safe to re-run.
- Does not change any application behavior; only removes an unintended,
  unusable API surface.
*/

REVOKE EXECUTE ON FUNCTION public.sync_invoice_paid_amount() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_invoice_paid_amount() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_invoice_paid_amount() FROM authenticated;
