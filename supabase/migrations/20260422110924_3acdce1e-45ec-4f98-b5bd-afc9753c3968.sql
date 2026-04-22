-- Step 1: Extend app_role enum with new values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'enfermero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'laboratorio';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmacia';