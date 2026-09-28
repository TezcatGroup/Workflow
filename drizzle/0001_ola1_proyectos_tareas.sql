CREATE TYPE "public"."estado_tarea" AS ENUM('ASIGNADA', 'EN_PROCESO', 'EN_REVISION', 'TERMINADA');--> statement-breakpoint
CREATE TYPE "public"."tipo_tarea" AS ENUM('OBLIGATORIA', 'OPCIONAL');--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"descripcion" text,
	"departamento_id" uuid,
	"creado_por_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_criterios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"descripcion" varchar(255) NOT NULL,
	"completado" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tareas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"tipo" "tipo_tarea" NOT NULL,
	"estado" "estado_tarea" DEFAULT 'ASIGNADA' NOT NULL,
	"prioridad" varchar(20),
	"dificultad" varchar(20),
	"requisitos" text,
	"proyecto_id" uuid,
	"departamento_id" uuid,
	"creado_por_id" uuid,
	"responsable_id" uuid,
	"revisor_id" uuid,
	"fecha_limite" timestamp with time zone NOT NULL,
	"xp_ofrecido" integer,
	"puntos_ofrecidos" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_departamento_id_departamentos_id_fk" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_criterios" ADD CONSTRAINT "tarea_criterios_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_departamento_id_departamentos_id_fk" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creado_por_id_usuarios_id_fk" FOREIGN KEY ("creado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_revisor_id_usuarios_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proyectos_departamento_idx" ON "proyectos" USING btree ("departamento_id");--> statement-breakpoint
CREATE INDEX "tarea_criterios_tarea_idx" ON "tarea_criterios" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tareas_proyecto_idx" ON "tareas" USING btree ("proyecto_id");--> statement-breakpoint
CREATE INDEX "tareas_responsable_idx" ON "tareas" USING btree ("responsable_id");--> statement-breakpoint
CREATE INDEX "tareas_estado_idx" ON "tareas" USING btree ("estado");