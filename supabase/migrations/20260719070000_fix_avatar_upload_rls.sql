/*
# Fix "new row violates row-level security policy" on photo/QR upload

## Problem
`AccountScreen.tsx` uploads the profile photo and QR code with
`supabase.storage.from('qr-codes').upload(path, file, { upsert: true })`.

The `qr-codes` bucket only had an INSERT policy (`qr_upload_own`). The very
first upload for a given path works fine (it's a plain INSERT), but every
time a user re-uploads a new photo to the SAME path (e.g. re-uploading their
avatar), Storage performs an UPSERT, which requires an UPDATE policy on
`storage.objects` as well. With no UPDATE policy, RLS silently blocks the
row and Supabase returns:
  "new row violates row-level security policy"

## Fix
Add an UPDATE policy scoped to the user's own folder. Paths are stored as
`${user_id}/avatar.<ext>` and `${user_id}/qr.<ext>`, so the first path
segment is always the owner's auth uid.

## Important Notes
- Safe to re-run (DROP POLICY IF EXISTS before CREATE POLICY).
- Also tightens the existing INSERT policy to be owner-scoped the same way,
  so one user can no longer write into another user's folder.
*/

-- Tighten INSERT to the user's own folder (first path segment = auth uid)
DROP POLICY IF EXISTS "qr_upload_own" ON storage.objects;
CREATE POLICY "qr_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add the missing UPDATE policy so upsert (re-uploading the same file) works
DROP POLICY IF EXISTS "qr_update_own" ON storage.objects;
CREATE POLICY "qr_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'qr-codes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
