CREATE TYPE "public"."estado_delegacion" AS ENUM('PENDIENTE', 'ACEPTADA', 'RECHAZADA');--> statement-breakpoint
CREATE TYPE "public"."resultado_revision" AS ENUM('APROBADA', 'DEVUELTA');--> statement-breakpoint
CREATE TABLE "tarea_archivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"subido_por_id" uuid,
	"nombre" varchar(255) NOT NULL,
	"ruta" text NOT NULL,
	"mime_type" varchar(100),
	"tamano_bytes" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_delegaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"solicitante_id" uuid,
	"destinatario_id" uuid,
	"motivo" text,
	"estado" "estado_delegacion" DEFAULT 'PENDIENTE' NOT NULL,
	"respondida_en" timestamp with time zone,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"actor_id" uuid,
	"tipo" varchar(50) NOT NULL,
	"detalle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"autor_id" uuid,
	"contenido" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_revisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"revisor_id" uuid,
	"resultado" "resultado_revision" NOT NULL,
	"observaciones" text,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tarea_archivos" ADD CONSTRAINT "tarea_archivos_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_archivos" ADD CONSTRAINT "tarea_archivos_subido_por_id_usuarios_id_fk" FOREIGN KEY ("subido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_delegaciones" ADD CONSTRAINT "tarea_delegaciones_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_delegaciones" ADD CONSTRAINT "tarea_delegaciones_solicitante_id_usuarios_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_delegaciones" ADD CONSTRAINT "tarea_delegaciones_destinatario_id_usuarios_id_fk" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_eventos" ADD CONSTRAINT "tarea_eventos_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_eventos" ADD CONSTRAINT "tarea_eventos_actor_id_usuarios_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_mensajes" ADD CONSTRAINT "tarea_mensajes_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_mensajes" ADD CONSTRAINT "tarea_mensajes_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_revisiones" ADD CONSTRAINT "tarea_revisiones_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_revisiones" ADD CONSTRAINT "tarea_revisiones_revisor_id_usuarios_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tarea_archivos_tarea_idx" ON "tarea_archivos" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tarea_delegaciones_tarea_idx" ON "tarea_delegaciones" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tarea_eventos_tarea_idx" ON "tarea_eventos" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tarea_mensajes_tarea_idx" ON "tarea_mensajes" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tarea_revisiones_tarea_idx" ON "tarea_revisiones" USING btree ("tarea_id");