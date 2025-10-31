-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create designs table to store user's home visualizer projects
CREATE TABLE public.designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Design',
  canvas_data JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own designs" 
ON public.designs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own designs" 
ON public.designs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs" 
ON public.designs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs" 
ON public.designs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create history table to store edit history
CREATE TABLE public.design_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  canvas_data JSONB NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.design_history ENABLE ROW LEVEL SECURITY;

-- Create policies for history access
CREATE POLICY "Users can view history of their designs" 
ON public.design_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.designs 
    WHERE designs.id = design_history.design_id 
    AND designs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create history for their designs" 
ON public.design_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.designs 
    WHERE designs.id = design_history.design_id 
    AND designs.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates on designs
CREATE TRIGGER update_designs_updated_at
BEFORE UPDATE ON public.designs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();