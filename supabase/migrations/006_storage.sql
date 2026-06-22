-- Private storage bucket for campaign assets (used in Phase 3+)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-assets', 'campaign-assets', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {organization_id}/{campaign_id}/{filename}

CREATE OR REPLACE FUNCTION public.storage_object_org_id(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

CREATE POLICY campaign_assets_select_member ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'campaign-assets'
    AND public.is_org_member(public.storage_object_org_id(name))
  );

CREATE POLICY campaign_assets_insert_member ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND public.is_org_member(public.storage_object_org_id(name))
  );

CREATE POLICY campaign_assets_update_member ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'campaign-assets'
    AND public.is_org_member(public.storage_object_org_id(name))
  )
  WITH CHECK (
    bucket_id = 'campaign-assets'
    AND public.is_org_member(public.storage_object_org_id(name))
  );

CREATE POLICY campaign_assets_delete_admin ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'campaign-assets'
    AND public.can_manage_org_settings(public.storage_object_org_id(name))
  );
