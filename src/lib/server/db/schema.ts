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
