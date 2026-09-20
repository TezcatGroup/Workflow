-- Datos de ejemplo seguros para una instalación nueva.
-- No incluye usuarios, contraseñas, sesiones ni registros de auditoría.
INSERT INTO public.departamentos (nombre) VALUES
  ('Administración'),
  ('Operaciones'),
  ('Tecnología')
ON CONFLICT (nombre) DO NOTHING;
