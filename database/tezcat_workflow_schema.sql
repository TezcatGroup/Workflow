--
-- PostgreSQL database dump
--

\restrict EJv8FVzMiWjJNWXOmdGfGCH2oeKQHr9cfoGTUIeEGjwQ7mrYa65maKi942Ba2st

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMIN',
    'ENCARGADO',
    'MIEMBRO'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    usuario_objetivo_id uuid,
    accion character varying(80) NOT NULL,
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    creada_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(120) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sesiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    creada_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(160) NOT NULL,
    email character varying(320) NOT NULL,
    password_hash text NOT NULL,
    rol public.rol_usuario DEFAULT 'MIEMBRO'::public.rol_usuario NOT NULL,
    departamento_id uuid,
    activo boolean DEFAULT true NOT NULL,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria_usuarios auditoria_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_pkey PRIMARY KEY (id);


--
-- Name: departamentos departamentos_nombre_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_nombre_unique UNIQUE (nombre);


--
-- Name: departamentos departamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departamentos
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id);


--
-- Name: sesiones sesiones_token_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_token_hash_unique UNIQUE (token_hash);


--
-- Name: usuarios usuarios_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_unique UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: auditoria_actor_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_actor_fecha_idx ON public.auditoria_usuarios USING btree (actor_id, creada_en);


--
-- Name: sesiones_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sesiones_usuario_idx ON public.sesiones USING btree (usuario_id);


--
-- Name: usuarios_departamento_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_departamento_idx ON public.usuarios USING btree (departamento_id);


--
-- Name: auditoria_usuarios auditoria_usuarios_actor_id_usuarios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_actor_id_usuarios_id_fk FOREIGN KEY (actor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: auditoria_usuarios auditoria_usuarios_usuario_objetivo_id_usuarios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_usuario_objetivo_id_usuarios_id_fk FOREIGN KEY (usuario_objetivo_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: sesiones sesiones_usuario_id_usuarios_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones
    ADD CONSTRAINT sesiones_usuario_id_usuarios_id_fk FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_departamento_id_departamentos_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_departamento_id_departamentos_id_fk FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict EJv8FVzMiWjJNWXOmdGfGCH2oeKQHr9cfoGTUIeEGjwQ7mrYa65maKi942Ba2st
