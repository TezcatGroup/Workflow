CREATE TYPE "public"."categoria_etiqueta" AS ENUM('LENGUAJE DE PROGRAMACIÓN', 'FRAMEWORK');--> statement-breakpoint
CREATE TABLE "etiquetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(60) NOT NULL,
	"categoria" "categoria_etiqueta" NOT NULL,
	"departamento_id" uuid NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_etiquetas" (
	"tarea_id" uuid NOT NULL,
	"etiqueta_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_departamento_id_departamentos_id_fk" FOREIGN KEY ("departamento_id") REFERENCES "public"."departamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_etiquetas" ADD CONSTRAINT "tarea_etiquetas_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_etiquetas" ADD CONSTRAINT "tarea_etiquetas_etiqueta_id_etiquetas_id_fk" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiquetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "etiquetas_departamento_nombre_idx" ON "etiquetas" USING btree ("departamento_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "tarea_etiquetas_unica_idx" ON "tarea_etiquetas" USING btree ("tarea_id","etiqueta_id");