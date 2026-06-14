CREATE POLICY "tenant_assets_deny_select" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id <> 'tenant-assets');
CREATE POLICY "tenant_assets_deny_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id <> 'tenant-assets');
CREATE POLICY "tenant_assets_deny_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id <> 'tenant-assets') WITH CHECK (bucket_id <> 'tenant-assets');
CREATE POLICY "tenant_assets_deny_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id <> 'tenant-assets');