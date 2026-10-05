ALTER TABLE "tareas" ADD COLUMN "numero" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "impacto" varchar(80);--> statement-breakpoint
ALTER TABLE "tareas" ADD COLUMN "estimado_minutos" integer;