CREATE TABLE "contribuciones_opcionales" (
  "tarea_id" uuid PRIMARY KEY,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios" ("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "contribuciones_opcionales_usuario_idx" ON "contribuciones_opcionales" ("usuario_id");
--> statement-breakpoint
INSERT INTO "contribuciones_opcionales" ("tarea_id", "usuario_id")
SELECT "id", "responsable_id"
FROM "tareas"
WHERE "tipo" = 'OPCIONAL' AND "estado" = 'TERMINADA' AND "responsable_id" IS NOT NULL;
