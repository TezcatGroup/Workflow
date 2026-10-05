CREATE TABLE "movimientos_puntos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tarea_id" uuid,
	"cantidad" integer NOT NULL,
	"motivo" varchar(255) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_rama" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rama_id" uuid NOT NULL,
	"tarea_id" uuid,
	"puntos" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_xp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tarea_id" uuid,
	"cantidad" integer NOT NULL,
	"motivo" varchar(255) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ramas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"color" varchar(30),
	"activo" boolean DEFAULT true NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ramas_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tarea_ramas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarea_id" uuid NOT NULL,
	"rama_id" uuid NOT NULL,
	"puntos" integer DEFAULT 0 NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_puntos" ADD CONSTRAINT "movimientos_puntos_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_rama" ADD CONSTRAINT "movimientos_rama_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_rama" ADD CONSTRAINT "movimientos_rama_rama_id_ramas_id_fk" FOREIGN KEY ("rama_id") REFERENCES "public"."ramas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_rama" ADD CONSTRAINT "movimientos_rama_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_xp" ADD CONSTRAINT "movimientos_xp_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_xp" ADD CONSTRAINT "movimientos_xp_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_ramas" ADD CONSTRAINT "tarea_ramas_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_ramas" ADD CONSTRAINT "tarea_ramas_rama_id_ramas_id_fk" FOREIGN KEY ("rama_id") REFERENCES "public"."ramas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimientos_puntos_usuario_idx" ON "movimientos_puntos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "movimientos_rama_usuario_idx" ON "movimientos_rama" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "movimientos_rama_rama_idx" ON "movimientos_rama" USING btree ("rama_id");--> statement-breakpoint
CREATE INDEX "movimientos_xp_usuario_idx" ON "movimientos_xp" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "tarea_ramas_tarea_idx" ON "tarea_ramas" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "tarea_ramas_rama_idx" ON "tarea_ramas" USING btree ("rama_id");