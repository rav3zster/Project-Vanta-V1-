-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('roster-images', 'roster-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;

-- Create policies for public access & upload
CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT USING (bucket_id = 'roster-images');
CREATE POLICY "Public Storage Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'roster-images');
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (bucket_id = 'roster-images');
