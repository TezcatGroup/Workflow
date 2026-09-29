CREATE TYPE "public"."estado_canje" AS ENUM('PENDIENTE', 'ENTREGADO', 'CANCELADO');--> statement-breakpoint
CREATE TABLE "canjes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"recompensa_id" uuid,
	"puntos_gastados" integer NOT NULL,
	"estado" "estado_canje" DEFAULT 'PENDIENTE' NOT NULL,
	"entregado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tarea_id" uuid,
	"titulo" varchar(200) NOT NULL,
	"mensaje" text NOT NULL,
	"enlace" text,
	"leida" boolean DEFAULT false NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recompensas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"descripcion" text,
	"costo_puntos" integer NOT NULL,
	"stock" integer,
	"imagen_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canjes" ADD CONSTRAINT "canjes_recompensa_id_recompensas_id_fk" FOREIGN KEY ("recompensa_id") REFERENCES "public"."recompensas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canjes_usuario_idx" ON "canjes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_idx" ON "notificaciones" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "notificaciones_leida_idx" ON "notificaciones" USING btree ("leida");