
-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'delivered');

-- Create enum for designer specialty
CREATE TYPE public.designer_specialty AS ENUM ('graphic_design', 'web_design', 'packaging', 'social_media', 'branding', 'motion', 'illustration', 'other');

-- Designers table
CREATE TABLE public.designers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  specialty designer_specialty[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Requests table (client requests)
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brief TEXT NOT NULL,
  requested_deadline DATE,
  status request_status NOT NULL DEFAULT 'pending',
  assigned_designer_id UUID REFERENCES public.designers(id),
  attachment_urls TEXT[] DEFAULT '{}',
  delivery_urls TEXT[] DEFAULT '{}',
  delivery_note TEXT,
  ai_category designer_specialty,
  ai_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Request history / activity log
CREATE TABLE public.request_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

-- Policies: Open access for now (will tighten with auth later)
CREATE POLICY "Anyone can view designers" ON public.designers FOR SELECT USING (true);
CREATE POLICY "Anyone can view requests" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Anyone can create requests" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update requests" ON public.requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can view request history" ON public.request_history FOR SELECT USING (true);
CREATE POLICY "Anyone can add request history" ON public.request_history FOR INSERT WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_designers_updated_at BEFORE UPDATE ON public.designers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for attachments and deliveries
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('deliveries', 'deliveries', true);

CREATE POLICY "Public read attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Anyone can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Public read deliveries" ON storage.objects FOR SELECT USING (bucket_id = 'deliveries');
CREATE POLICY "Anyone can upload deliveries" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deliveries');

-- Seed some designers
INSERT INTO public.designers (name, email, specialty) VALUES
  ('Ahmet Yılmaz', 'ahmet@sirket.com', ARRAY['graphic_design', 'branding']::designer_specialty[]),
  ('Elif Demir', 'elif@sirket.com', ARRAY['web_design', 'social_media']::designer_specialty[]),
  ('Can Öztürk', 'can@sirket.com', ARRAY['packaging', 'illustration']::designer_specialty[]),
  ('Zeynep Kaya', 'zeynep@sirket.com', ARRAY['motion', 'social_media']::designer_specialty[]),
  ('Mert Arslan', 'mert@sirket.com', ARRAY['graphic_design', 'packaging']::designer_specialty[]),
  ('Selin Çelik', 'selin@sirket.com', ARRAY['web_design', 'branding']::designer_specialty[]),
  ('Burak Şahin', 'burak@sirket.com', ARRAY['illustration', 'graphic_design']::designer_specialty[]);
