import {
  boolean, index, integer, jsonb, pgEnum, pgTable,
  text, timestamp, uuid, varchar
} from 'drizzle-orm/pg-core';

export const rolUsuario = pgEnum('rol_usuario', ['ADMIN', 'ENCARGADO', 'MIEMBRO']);

export const departamentos = pgTable('departamentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 120 }).notNull().unique(),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: rolUsuario('rol').notNull().default('MIEMBRO'),
  departamentoId: uuid('departamento_id').references(() => departamentos.id, { onDelete: 'set null' }),
  activo: boolean('activo').notNull().default(true),
  intentosFallidos: integer('intentos_fallidos').notNull().default(0),
  bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [index('usuarios_departamento_idx').on(t.departamentoId)]);

export const sesiones = pgTable('sesiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [index('sesiones_usuario_idx').on(t.usuarioId)]);

export const auditoriaUsuarios = pgTable('auditoria_usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => usuarios.id, { onDelete: 'set null' }),
  usuarioObjetivoId: uuid('usuario_objetivo_id').references(() => usuarios.id, { onDelete: 'set null' }),
  accion: varchar('accion', { length: 80 }).notNull(),
  detalle: jsonb('detalle').$type<Record<string, unknown>>().notNull().default({}),
  creadaEn: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [index('auditoria_actor_fecha_idx').on(t.actorId, t.creadaEn)]);

export const proyectos = pgTable('proyectos', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  descripcion: text('descripcion'),
  departamentoId: uuid('departamento_id').references(() => departamentos.id, { onDelete: 'set null' }),
  creadoPorId: uuid('creado_por_id').references(() => usuarios.id, { onDelete: 'set null' }),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [index('proyectos_departamento_idx').on(t.departamentoId)]);

export const tipoTarea = pgEnum('tipo_tarea', ['OBLIGATORIA', 'OPCIONAL']);
export const estadoTarea = pgEnum('estado_tarea', ['ASIGNADA', 'EN_PROCESO', 'EN_REVISION', 'TERMINADA']);

export const tareas = pgTable('tareas', {
  id: uuid('id').defaultRandom().primaryKey(),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  tipo: tipoTarea('tipo').notNull(),
  estado: estadoTarea('estado').notNull().default('ASIGNADA'),
  prioridad: varchar('prioridad', { length: 20 }),
  dificultad: varchar('dificultad', { length: 20 }),
  requisitos: text('requisitos'),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'set null' }),
  departamentoId: uuid('departamento_id').references(() => departamentos.id, { onDelete: 'set null' }),
  creadoPorId: uuid('creado_por_id').references(() => usuarios.id, { onDelete: 'set null' }),
  responsableId: uuid('responsable_id').references(() => usuarios.id, { onDelete: 'set null' }),
  revisorId: uuid('revisor_id').references(() => usuarios.id, { onDelete: 'set null' }),
  fechaLimite: timestamp('fecha_limite', { withTimezone: true }).notNull(),
  xpOfrecido: integer('xp_ofrecido'),
  puntosOfrecidos: integer('puntos_ofrecidos'),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  index('tareas_proyecto_idx').on(t.proyectoId),
  index('tareas_responsable_idx').on(t.responsableId),
  index('tareas_estado_idx').on(t.estado)
]);

export const tareaCriterios = pgTable('tarea_criterios', {
  id: uuid('id').defaultRandom().primaryKey(),
  tareaId: uuid('tarea_id').notNull().references(() => tareas.id, { onDelete: 'cascade' }),
  descripcion: varchar('descripcion', { length: 255 }).notNull(),
  completado: boolean('completado').notNull().default(false),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow()
}, (t) => [index('tarea_criterios_tarea_idx').on(t.tareaId)]);

