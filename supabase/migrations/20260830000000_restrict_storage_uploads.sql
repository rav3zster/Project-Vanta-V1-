-- The "roster-images" bucket previously allowed fully anonymous (public) INSERT
-- and UPDATE, meaning anyone with the public anon key (shipped in the client
-- bundle, as normal for Supabase) could upload arbitrary files or overwrite any
-- existing roster photo without ever signing in. Reads stay public (roster
-- photos are meant to be visible on the public site); writes are restricted to
-- signed-in users.
--
-- Note: this still does not enforce the app's `roster.manage` RBAC permission
-- (any authenticated HUMAN, not just GOD/DEMI_GOD, can still upload) because
-- Storage policies can't see the app's KV-based role model. Closing that gap
-- fully requires routing uploads through the edge function (which already
-- knows the caller's role) instead of uploading directly from the browser.

DROP POLICY IF EXISTS "Public Storage Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;

CREATE POLICY "Authenticated Storage Upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'roster-images');

CREATE POLICY "Authenticated Storage Update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'roster-images');
