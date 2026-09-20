--
-- PostgreSQL database dump
--

\restrict eOOkMvJl4bTl9mfRCnOcWpcsHOKGrvrNA89B2jwgz3340XGtMFdxVwjWyM7mkhg

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
-- Data for Name: departamentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departamentos (id, nombre, activo, creado_en) FROM stdin;
901d5849-939b-403c-9cbd-1cba83daa00d	Pruebas fa968db5	t	2026-09-19 22:42:25.308475-06
92768966-1393-45cf-9d21-883608aaa995	Pruebas 74163f42	t	2026-09-19 22:44:09.658562-06
2581e4da-4a01-4603-928f-ea6f29325f52	Pruebas c25fd8fe actualizado	t	2026-09-19 22:48:02.679394-06
6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb	Pruebas 78e2379b actualizado	t	2026-09-19 22:49:13.781457-06
06cceea2-9996-411d-9de0-5f0d0d08d060	Pruebas 140dd868 actualizado	t	2026-09-19 22:57:34.485892-06
ef1621f8-9714-47b2-ba2f-2202b3e980f5	Pruebas 600034a3 actualizado	t	2026-09-19 22:58:59.313718-06
188eff3c-9e6b-4983-b874-066a20aea0d1	Pruebas d675ccb4 actualizado	t	2026-09-19 23:00:02.306525-06
9d0a83c3-6bd3-4a91-890e-e7dd9060afc8	Pruebas d08bb14e actualizado	t	2026-09-19 23:03:10.462876-06
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, email, password_hash, rol, departamento_id, activo, intentos_fallidos, bloqueado_hasta, creado_en, actualizado_en) FROM stdin;
57f82ad4-3275-4aa7-aa8a-18613b197a69	Encargado de prueba	encargado-74163f42@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$u0ySzF1VWX1tgZvXvXCzxw$V+Ics53yZFoHYx3Zo0G6CTPrvUNvV6klxDVNu9/EiAs	ENCARGADO	92768966-1393-45cf-9d21-883608aaa995	t	0	\N	2026-09-19 22:44:10.633202-06	2026-09-19 22:44:10.633202-06
4c38a20d-25ec-4ff1-b996-e0d2efd45bce	Encargado de prueba	encargado-140dd868@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$WVHO3cdFUnlvpgSFU+tTBA$EfRH20covV4sEqOYzrRPo11w6gEZ9Gl0BnYdZ5DM04s	ENCARGADO	06cceea2-9996-411d-9de0-5f0d0d08d060	t	0	\N	2026-09-19 22:57:36.268419-06	2026-09-19 22:57:36.268419-06
90fe1268-0b9a-4619-bdcd-6ead46384d94	Bloqueo de prueba	bloqueo-78e2379b@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$Fb/l16HNtJAGE9MwS4XXuA$9PZj9+qAT4aQWzF01NULOB8lVGMAbTB90wrE+KOjY+8	MIEMBRO	6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb	t	5	2026-09-19 23:04:14.805883-06	2026-09-19 22:49:14.398619-06	2026-09-19 22:49:14.398619-06
96f09d10-779b-40e6-bdc7-53adcef11a03	Miembro actualizado	miembro-c25fd8fe@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$YQBUv7a/9Wj+zfbP7MV8/g$HzTRnae28oHNC3Ia1sDl2kwaU280mN0E2LRi79ZchW4	MIEMBRO	2581e4da-4a01-4603-928f-ea6f29325f52	f	0	\N	2026-09-19 22:48:02.914503-06	2026-09-19 22:48:03.2-06
9a509515-e10e-43ed-9e99-8f6d2cd4daeb	Miembro actualizado	miembro-fa968db5@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$d9eRnONe5LXOlf3Nl6/nmg$G23m6YG58btiqedLKGFVGisZ3hfHHuJii4FpifwdzJk	MIEMBRO	901d5849-939b-403c-9cbd-1cba83daa00d	f	0	\N	2026-09-19 22:42:25.53326-06	2026-09-19 22:42:25.897-06
c1c3a85c-0ff1-413e-bcf5-364722aaf48d	Encargado de prueba	encargado-78e2379b@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$l27uju0fCmdC3lho0E5BHA$F1en9cUeE4NpIHVoRqfC0r/KcTZ1Fy/w1qeXw34T+C4	ENCARGADO	6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb	t	0	\N	2026-09-19 22:49:14.990893-06	2026-09-19 22:49:14.990893-06
356b407e-d6f7-493b-899f-de07bcaefe25	Encargado de prueba	encargado-d08bb14e@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$dS+BGargneEMGNSlR2/z/w$AfutTQ+o52mmfMRbXHoQeL/93iL108z31VwnYwa1zM8	ENCARGADO	9d0a83c3-6bd3-4a91-890e-e7dd9060afc8	t	0	\N	2026-09-19 23:03:11.686545-06	2026-09-19 23:03:11.686545-06
d9124b5d-3f32-4d0c-b314-8b407f515602	Bloqueo de prueba	bloqueo-fa968db5@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$dBQptQEGTldUvVXrGrZE8Q$u01K6TmA+460pfSyedova/G8sspTygUU+Vk+MDwTS6Y	MIEMBRO	901d5849-939b-403c-9cbd-1cba83daa00d	t	5	2026-09-19 22:57:26.359-06	2026-09-19 22:42:25.984455-06	2026-09-19 22:42:25.984455-06
1ce9ceb6-e1c1-4bcc-8e7b-14ca6cbe9dc3	Encargado de prueba	encargado-fa968db5@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$OOZsPjpV9ecLNHEpR7MAFw$Y/m7Lr59FGLWhoQlPsvF0lV9OrLcnRoaOjL4NqjfHYU	ENCARGADO	901d5849-939b-403c-9cbd-1cba83daa00d	t	0	\N	2026-09-19 22:42:26.473544-06	2026-09-19 22:42:26.473544-06
6913d328-3d0a-4c48-98c9-2c62ae920895	Bloqueo de prueba	bloqueo-c25fd8fe@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$uD+2XrDSBltIiBoOzkb84A$Tg/qRQDA5S6yEG4MWbwFxA4sc87zU5+rd8jjdqjtWco	MIEMBRO	2581e4da-4a01-4603-928f-ea6f29325f52	t	5	2026-09-19 23:03:03.649-06	2026-09-19 22:48:03.298492-06	2026-09-19 22:48:03.298492-06
464f78f2-1d9a-46a4-9841-7ecc931f2ad7	Miembro actualizado	miembro-74163f42@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$cImk+GixfKoWs9675jM7Ag$6mWbklXVUvPz34hZzVIjnPeFOkpLP7UOm4mW227HrdY	MIEMBRO	92768966-1393-45cf-9d21-883608aaa995	f	0	\N	2026-09-19 22:44:09.843202-06	2026-09-19 22:44:10.123-06
4e4e521a-5c7a-4e99-bfb2-b0936622554a	Encargado de prueba	encargado-c25fd8fe@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$CdsHxpRFLWBjW9LRG8H4bQ$qZH6PqmmNSOsJqgl2X/vruOppcFK/sOQSxDTG9jTdDI	ENCARGADO	2581e4da-4a01-4603-928f-ea6f29325f52	t	0	\N	2026-09-19 22:48:03.738069-06	2026-09-19 22:48:03.738069-06
411c4800-3c92-4560-b141-01a569cf0b51	Bloqueo de prueba	bloqueo-74163f42@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$oXKt9DSfRiTL+F1Hh9C25w$af4/hfnMm6dnkGBUTT0c2R+OmOFCeQa6FTVTC5jpYPY	MIEMBRO	92768966-1393-45cf-9d21-883608aaa995	t	5	2026-09-19 22:59:10.538-06	2026-09-19 22:44:10.206134-06	2026-09-19 22:44:10.206134-06
58da5740-1198-4717-bd5e-2be8805ed547	Encargado de prueba	encargado-600034a3@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$i8dhJ9N2J7iISZUm3yNt+w$eBUt18rMGPgmzFV/UkxCQJOWbJx1fsJ14mU/o9tC+D8	ENCARGADO	ef1621f8-9714-47b2-ba2f-2202b3e980f5	t	0	\N	2026-09-19 22:59:00.563125-06	2026-09-19 22:59:00.563125-06
f18a4c16-2dd6-4505-ba8d-0e4d83dbdc0c	Administrador de demostración	admin@local.test	$argon2id$v=19$m=19456,t=2,p=1$ojdkl1AkfIN71LznOG6vpQ$TEJH6038U/e7wXAIK4kiRITQUBLIl5PizRCBEKTRQTk	ADMIN	\N	t	0	\N	2026-09-19 22:55:48.105616-06	2026-09-19 22:55:48.105616-06
b8e72cdd-30d6-43a5-86c0-a7f42fd0c718	Miembro actualizado	miembro-78e2379b@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$DAiSdRofWV0zztGnSS6aig$hNu0EHI/ykUR++WjUMs/J9xQV3pqoj1rnYMhntG676Q	MIEMBRO	6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb	f	0	\N	2026-09-19 22:49:14.026169-06	2026-09-19 22:49:14.3-06
8c0d0472-9080-4aa4-8715-34510e8dea0a	Miembro actualizado	miembro-140dd868@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$EJrhPJXpUJjcGXI3f05w/A$7Zpm8DTePiG9F5NYrchjuKHYOVj9elwdKCCb+0etj8I	MIEMBRO	06cceea2-9996-411d-9de0-5f0d0d08d060	f	0	\N	2026-09-19 22:57:34.816644-06	2026-09-19 22:57:35.212-06
e57ef735-7409-4f79-b577-0899b48c5c80	Miembro actualizado	miembro-600034a3@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$+aGbW3tLiaxuDrwHde17Dg$J18wEYqBscvY7XUOjkKwEO3j2Cta7SaiGOjxdKs7zw4	MIEMBRO	ef1621f8-9714-47b2-ba2f-2202b3e980f5	f	0	\N	2026-09-19 22:58:59.580636-06	2026-09-19 22:58:59.931-06
006972c7-6ff6-48d7-82d1-3959f6c7107a	Miembro actualizado	miembro-d08bb14e@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$geuyAU4NicRDfEKzuoFf2Q$fMjlaYp2OizKIJGovzTd1esNVc5DrpzlGKJZBDOgFQA	MIEMBRO	9d0a83c3-6bd3-4a91-890e-e7dd9060afc8	f	0	\N	2026-09-19 23:03:10.812864-06	2026-09-19 23:03:11.134-06
e46c967d-53ae-4169-a655-dc516511d38c	Bloqueo de prueba	bloqueo-140dd868@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$jUrj0Y1V+0ggudD4VlVL9g$x34T7pdUwhKgpqhwGpc5eHmZCrWgmQ48ZTPJAJzfEx0	MIEMBRO	06cceea2-9996-411d-9de0-5f0d0d08d060	t	5	2026-09-19 23:12:36.141318-06	2026-09-19 22:57:35.326032-06	2026-09-19 22:57:35.326032-06
93421b0c-580b-4fb8-895f-9f7ac5b32665	Bloqueo de prueba	bloqueo-d675ccb4@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$PoYrLPWKJj/mmli+2BIunA$Xu5Kk+KgJTQ6DjJnmofAONJ8ykWC7RZBAMWhpLRvDUM	MIEMBRO	188eff3c-9e6b-4983-b874-066a20aea0d1	t	5	2026-09-19 23:15:03.343085-06	2026-09-19 23:00:02.937755-06	2026-09-19 23:00:02.937755-06
9f27520b-a125-47ad-90e2-46caaa6b25fa	Bloqueo de prueba	bloqueo-600034a3@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$8ein5WkteElSWF4qk0SBiw$MA6f9P7G4xIwJVhty03vkard+Yy6XWk9PBwhzjL+rlU	MIEMBRO	ef1621f8-9714-47b2-ba2f-2202b3e980f5	t	5	2026-09-19 23:14:00.452382-06	2026-09-19 22:59:00.048766-06	2026-09-19 22:59:00.048766-06
fbc2a3b0-3291-43f6-a5bc-c28233ceb870	Miembro actualizado	miembro-d675ccb4@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$Prb0/9BM+rmV7HL1/Voqfg$OSRgwHvRwMQ+vAEUC31FTH0MBt9ZqHqS09TxWYnTcg4	MIEMBRO	188eff3c-9e6b-4983-b874-066a20aea0d1	f	0	\N	2026-09-19 23:00:02.538285-06	2026-09-19 23:00:02.838-06
afef5f7f-e766-40ac-a579-e97a968138a3	Encargado de prueba	encargado-d675ccb4@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$zwaLpWYZrsToBls9o0/qYA$iwlDADi9hahPW2PUtEhl59JuPz1AjYxUf58MHf2ISCQ	ENCARGADO	188eff3c-9e6b-4983-b874-066a20aea0d1	t	0	\N	2026-09-19 23:00:03.458609-06	2026-09-19 23:00:03.458609-06
c14d57d5-3987-4dd9-8b10-44ef3985f68e	Administrador inicial	admin@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$SkVMUYyKvnruxUtrHn1fqw$eGfnlsGVTMkAYGAwqohpE7wn9cSENsy+7a41J2f67ns	ADMIN	\N	t	0	\N	2026-09-19 22:39:26.542391-06	2026-09-19 22:39:26.542391-06
6afd4a47-c460-4806-9472-9e9d9a44d6f1	Bloqueo de prueba	bloqueo-d08bb14e@tezcat.local	$argon2id$v=19$m=19456,t=2,p=1$d2hXwzSwnfS/sdegvGM53Q$8yIgZ3km+2G4nxCX/q6aA3gKTojEi4Z800NRbmX7T1E	MIEMBRO	9d0a83c3-6bd3-4a91-890e-e7dd9060afc8	t	5	2026-09-19 23:18:11.599182-06	2026-09-19 23:03:11.23419-06	2026-09-19 23:03:11.23419-06
\.


--
-- Data for Name: auditoria_usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auditoria_usuarios (id, actor_id, usuario_objetivo_id, accion, detalle, creada_en) FROM stdin;
dc850701-c1f5-4fb4-81bc-3b85279b5bbc	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "901d5849-939b-403c-9cbd-1cba83daa00d", "nombre": "Pruebas fa968db5"}	2026-09-19 22:42:25.308475-06
d4901369-7327-47c1-9365-68d72096332d	c14d57d5-3987-4dd9-8b10-44ef3985f68e	9a509515-e10e-43ed-9e99-8f6d2cd4daeb	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-fa968db5@tezcat.local", "departamentoId": "901d5849-939b-403c-9cbd-1cba83daa00d"}	2026-09-19 22:42:25.53326-06
e103629b-4502-40f5-9ae6-8ee8d3fe1b71	c14d57d5-3987-4dd9-8b10-44ef3985f68e	9a509515-e10e-43ed-9e99-8f6d2cd4daeb	USUARIO_ACTUALIZADO	{"antes": {"id": "9a509515-e10e-43ed-9e99-8f6d2cd4daeb", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "901d5849-939b-403c-9cbd-1cba83daa00d"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "901d5849-939b-403c-9cbd-1cba83daa00d"}}	2026-09-19 22:42:25.616906-06
0e484873-e2fb-4a1c-8939-0e0ddfeb5595	c14d57d5-3987-4dd9-8b10-44ef3985f68e	9a509515-e10e-43ed-9e99-8f6d2cd4daeb	USUARIO_DESACTIVADO	{}	2026-09-19 22:42:25.896157-06
99a1ca4c-c2b6-48b9-92f5-2dd5805cd8ba	c14d57d5-3987-4dd9-8b10-44ef3985f68e	d9124b5d-3f32-4d0c-b314-8b407f515602	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-fa968db5@tezcat.local", "departamentoId": "901d5849-939b-403c-9cbd-1cba83daa00d"}	2026-09-19 22:42:25.984455-06
1f93c31f-be50-4153-9eb1-085146bae2e2	c14d57d5-3987-4dd9-8b10-44ef3985f68e	1ce9ceb6-e1c1-4bcc-8e7b-14ca6cbe9dc3	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-fa968db5@tezcat.local", "departamentoId": "901d5849-939b-403c-9cbd-1cba83daa00d"}	2026-09-19 22:42:26.473544-06
eedff13a-5538-4d05-b56b-ead38e329474	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "92768966-1393-45cf-9d21-883608aaa995", "nombre": "Pruebas 74163f42"}	2026-09-19 22:44:09.658562-06
03e997e4-1b8b-4c77-8385-f2cacb69d9c2	c14d57d5-3987-4dd9-8b10-44ef3985f68e	464f78f2-1d9a-46a4-9841-7ecc931f2ad7	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-74163f42@tezcat.local", "departamentoId": "92768966-1393-45cf-9d21-883608aaa995"}	2026-09-19 22:44:09.843202-06
e55e3efa-44ac-4f2e-9dc4-ba6cadb0fddf	c14d57d5-3987-4dd9-8b10-44ef3985f68e	464f78f2-1d9a-46a4-9841-7ecc931f2ad7	USUARIO_ACTUALIZADO	{"antes": {"id": "464f78f2-1d9a-46a4-9841-7ecc931f2ad7", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "92768966-1393-45cf-9d21-883608aaa995"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "92768966-1393-45cf-9d21-883608aaa995"}}	2026-09-19 22:44:09.892003-06
c52a2ef1-c669-47ae-a3e4-473b0eca6bb5	c14d57d5-3987-4dd9-8b10-44ef3985f68e	464f78f2-1d9a-46a4-9841-7ecc931f2ad7	USUARIO_DESACTIVADO	{}	2026-09-19 22:44:10.123846-06
dcfb3baf-c271-441d-91a8-eee8b10c9046	c14d57d5-3987-4dd9-8b10-44ef3985f68e	411c4800-3c92-4560-b141-01a569cf0b51	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-74163f42@tezcat.local", "departamentoId": "92768966-1393-45cf-9d21-883608aaa995"}	2026-09-19 22:44:10.206134-06
eec691e2-721f-4f68-824b-b1c4337d60a4	c14d57d5-3987-4dd9-8b10-44ef3985f68e	57f82ad4-3275-4aa7-aa8a-18613b197a69	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-74163f42@tezcat.local", "departamentoId": "92768966-1393-45cf-9d21-883608aaa995"}	2026-09-19 22:44:10.633202-06
f93251f2-2a0a-4225-9ecf-e3c4e846d6ad	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "2581e4da-4a01-4603-928f-ea6f29325f52", "nombre": "Pruebas c25fd8fe"}	2026-09-19 22:48:02.679394-06
6a8ccfa0-7279-4c68-934c-5c7cb9ffddb3	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "2581e4da-4a01-4603-928f-ea6f29325f52", "antes": {"activo": true, "nombre": "Pruebas c25fd8fe"}, "despues": {"activo": true, "nombre": "Pruebas c25fd8fe actualizado"}}	2026-09-19 22:48:02.821977-06
c9bcd4f4-888c-4aad-b597-f6711b791275	c14d57d5-3987-4dd9-8b10-44ef3985f68e	96f09d10-779b-40e6-bdc7-53adcef11a03	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-c25fd8fe@tezcat.local", "departamentoId": "2581e4da-4a01-4603-928f-ea6f29325f52"}	2026-09-19 22:48:02.914503-06
f6d79775-eba3-464e-a16a-ff28b547060d	c14d57d5-3987-4dd9-8b10-44ef3985f68e	96f09d10-779b-40e6-bdc7-53adcef11a03	USUARIO_ACTUALIZADO	{"antes": {"id": "96f09d10-779b-40e6-bdc7-53adcef11a03", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "2581e4da-4a01-4603-928f-ea6f29325f52"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "2581e4da-4a01-4603-928f-ea6f29325f52"}}	2026-09-19 22:48:02.961734-06
cf7bfa34-d8f1-4bfa-a828-fec1aa39f362	c14d57d5-3987-4dd9-8b10-44ef3985f68e	96f09d10-779b-40e6-bdc7-53adcef11a03	USUARIO_DESACTIVADO	{}	2026-09-19 22:48:03.200328-06
0d92c8ed-7d46-4a5a-9d25-4844c1fed57b	c14d57d5-3987-4dd9-8b10-44ef3985f68e	6913d328-3d0a-4c48-98c9-2c62ae920895	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-c25fd8fe@tezcat.local", "departamentoId": "2581e4da-4a01-4603-928f-ea6f29325f52"}	2026-09-19 22:48:03.298492-06
fbf5d834-e717-4807-9e31-758fd51d7760	c14d57d5-3987-4dd9-8b10-44ef3985f68e	4e4e521a-5c7a-4e99-bfb2-b0936622554a	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-c25fd8fe@tezcat.local", "departamentoId": "2581e4da-4a01-4603-928f-ea6f29325f52"}	2026-09-19 22:48:03.738069-06
04900dae-5224-4d57-92f1-5b4fa22116cf	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb", "nombre": "Pruebas 78e2379b"}	2026-09-19 22:49:13.781457-06
89bc4d32-8f5e-49d1-b4eb-7181639f0b97	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb", "antes": {"activo": true, "nombre": "Pruebas 78e2379b"}, "despues": {"activo": true, "nombre": "Pruebas 78e2379b actualizado"}}	2026-09-19 22:49:13.942891-06
35e01106-2848-4474-8162-acbbe0f20483	c14d57d5-3987-4dd9-8b10-44ef3985f68e	b8e72cdd-30d6-43a5-86c0-a7f42fd0c718	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-78e2379b@tezcat.local", "departamentoId": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb"}	2026-09-19 22:49:14.026169-06
d02025ec-9644-494f-bf6a-99f463eb6905	c14d57d5-3987-4dd9-8b10-44ef3985f68e	b8e72cdd-30d6-43a5-86c0-a7f42fd0c718	USUARIO_ACTUALIZADO	{"antes": {"id": "b8e72cdd-30d6-43a5-86c0-a7f42fd0c718", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb"}}	2026-09-19 22:49:14.075351-06
f7eced3d-1131-472e-b8b8-8ac1f585188d	c14d57d5-3987-4dd9-8b10-44ef3985f68e	b8e72cdd-30d6-43a5-86c0-a7f42fd0c718	USUARIO_DESACTIVADO	{}	2026-09-19 22:49:14.29992-06
b8ee9263-0028-4ae3-bcb4-f2cb299024d6	c14d57d5-3987-4dd9-8b10-44ef3985f68e	90fe1268-0b9a-4619-bdcd-6ead46384d94	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-78e2379b@tezcat.local", "departamentoId": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb"}	2026-09-19 22:49:14.398619-06
e41e263d-78e3-4614-adcf-eba2792ce4ff	c14d57d5-3987-4dd9-8b10-44ef3985f68e	c1c3a85c-0ff1-413e-bcf5-364722aaf48d	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-78e2379b@tezcat.local", "departamentoId": "6a5661ac-a0f7-4fb3-b1f3-05f3e6ed6fbb"}	2026-09-19 22:49:14.990893-06
175b62a6-2a3e-400f-8f02-64e9fe02ff61	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "06cceea2-9996-411d-9de0-5f0d0d08d060", "nombre": "Pruebas 140dd868"}	2026-09-19 22:57:34.485892-06
65badbcc-673a-4454-bb52-fb8e31f069e8	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "06cceea2-9996-411d-9de0-5f0d0d08d060", "antes": {"activo": true, "nombre": "Pruebas 140dd868"}, "despues": {"activo": true, "nombre": "Pruebas 140dd868 actualizado"}}	2026-09-19 22:57:34.69941-06
8d641377-a9cb-47ae-9dd2-aded1d6c3fcc	c14d57d5-3987-4dd9-8b10-44ef3985f68e	8c0d0472-9080-4aa4-8715-34510e8dea0a	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-140dd868@tezcat.local", "departamentoId": "06cceea2-9996-411d-9de0-5f0d0d08d060"}	2026-09-19 22:57:34.816644-06
4376ca49-d2c3-41cd-b16c-ccb8944744a7	c14d57d5-3987-4dd9-8b10-44ef3985f68e	8c0d0472-9080-4aa4-8715-34510e8dea0a	USUARIO_ACTUALIZADO	{"antes": {"id": "8c0d0472-9080-4aa4-8715-34510e8dea0a", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "06cceea2-9996-411d-9de0-5f0d0d08d060"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "06cceea2-9996-411d-9de0-5f0d0d08d060"}}	2026-09-19 22:57:34.912208-06
c5273a1f-5e8c-421f-97bb-1dea29690ced	c14d57d5-3987-4dd9-8b10-44ef3985f68e	8c0d0472-9080-4aa4-8715-34510e8dea0a	USUARIO_DESACTIVADO	{}	2026-09-19 22:57:35.21146-06
edea204e-10e7-4e9f-a7eb-a6004e6088c0	c14d57d5-3987-4dd9-8b10-44ef3985f68e	e46c967d-53ae-4169-a655-dc516511d38c	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-140dd868@tezcat.local", "departamentoId": "06cceea2-9996-411d-9de0-5f0d0d08d060"}	2026-09-19 22:57:35.326032-06
580171f2-cc0c-4848-af2d-11db40431df5	c14d57d5-3987-4dd9-8b10-44ef3985f68e	4c38a20d-25ec-4ff1-b996-e0d2efd45bce	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-140dd868@tezcat.local", "departamentoId": "06cceea2-9996-411d-9de0-5f0d0d08d060"}	2026-09-19 22:57:36.268419-06
01f9831f-47a8-4584-b242-e839a0f0fd73	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "ef1621f8-9714-47b2-ba2f-2202b3e980f5", "nombre": "Pruebas 600034a3"}	2026-09-19 22:58:59.313718-06
3a4a47ea-969c-4dca-88f5-f7d14ebf8c0f	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "ef1621f8-9714-47b2-ba2f-2202b3e980f5", "antes": {"activo": true, "nombre": "Pruebas 600034a3"}, "despues": {"activo": true, "nombre": "Pruebas 600034a3 actualizado"}}	2026-09-19 22:58:59.483017-06
de09b24f-b1a0-45cd-b1c2-338bad907663	c14d57d5-3987-4dd9-8b10-44ef3985f68e	e57ef735-7409-4f79-b577-0899b48c5c80	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-600034a3@tezcat.local", "departamentoId": "ef1621f8-9714-47b2-ba2f-2202b3e980f5"}	2026-09-19 22:58:59.580636-06
6e1a08c5-4696-4319-8658-b4d40e297a7b	c14d57d5-3987-4dd9-8b10-44ef3985f68e	e57ef735-7409-4f79-b577-0899b48c5c80	USUARIO_DESACTIVADO	{}	2026-09-19 22:58:59.931938-06
58d11b2f-eab7-4dd6-a1b0-abb3b5fc13eb	c14d57d5-3987-4dd9-8b10-44ef3985f68e	9f27520b-a125-47ad-90e2-46caaa6b25fa	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-600034a3@tezcat.local", "departamentoId": "ef1621f8-9714-47b2-ba2f-2202b3e980f5"}	2026-09-19 22:59:00.048766-06
0c7113a7-d45e-42d8-9524-f5f0fcec222b	c14d57d5-3987-4dd9-8b10-44ef3985f68e	58da5740-1198-4717-bd5e-2be8805ed547	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-600034a3@tezcat.local", "departamentoId": "ef1621f8-9714-47b2-ba2f-2202b3e980f5"}	2026-09-19 22:59:00.563125-06
a578292b-47b8-4233-94ce-33c772a7a7f3	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "188eff3c-9e6b-4983-b874-066a20aea0d1", "antes": {"activo": true, "nombre": "Pruebas d675ccb4"}, "despues": {"activo": true, "nombre": "Pruebas d675ccb4 actualizado"}}	2026-09-19 23:00:02.457258-06
85ee7135-1708-4cc9-87b1-0b17587d1a0b	c14d57d5-3987-4dd9-8b10-44ef3985f68e	fbc2a3b0-3291-43f6-a5bc-c28233ceb870	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-d675ccb4@tezcat.local", "departamentoId": "188eff3c-9e6b-4983-b874-066a20aea0d1"}	2026-09-19 23:00:02.538285-06
e1eaf2ab-85cb-40d2-8b6d-607e85eaba76	c14d57d5-3987-4dd9-8b10-44ef3985f68e	fbc2a3b0-3291-43f6-a5bc-c28233ceb870	USUARIO_DESACTIVADO	{}	2026-09-19 23:00:02.8373-06
055915bc-0212-4f63-91d7-a83e3d8ddf9f	c14d57d5-3987-4dd9-8b10-44ef3985f68e	93421b0c-580b-4fb8-895f-9f7ac5b32665	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-d675ccb4@tezcat.local", "departamentoId": "188eff3c-9e6b-4983-b874-066a20aea0d1"}	2026-09-19 23:00:02.937755-06
192e574c-1ade-4d29-9b77-ac82550fbaed	c14d57d5-3987-4dd9-8b10-44ef3985f68e	afef5f7f-e766-40ac-a579-e97a968138a3	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-d675ccb4@tezcat.local", "departamentoId": "188eff3c-9e6b-4983-b874-066a20aea0d1"}	2026-09-19 23:00:03.458609-06
82c1f2d6-ee21-4b4b-a8c0-34d961aa208e	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8", "nombre": "Pruebas d08bb14e"}	2026-09-19 23:03:10.462876-06
3feb6f67-42a6-45f8-9d31-34b94a6ac73f	c14d57d5-3987-4dd9-8b10-44ef3985f68e	006972c7-6ff6-48d7-82d1-3959f6c7107a	USUARIO_ACTUALIZADO	{"antes": {"id": "006972c7-6ff6-48d7-82d1-3959f6c7107a", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8"}}	2026-09-19 23:03:10.860383-06
8d7d0a52-339d-4bdc-9cb5-e1ba047a04c0	c14d57d5-3987-4dd9-8b10-44ef3985f68e	e57ef735-7409-4f79-b577-0899b48c5c80	USUARIO_ACTUALIZADO	{"antes": {"id": "e57ef735-7409-4f79-b577-0899b48c5c80", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "ef1621f8-9714-47b2-ba2f-2202b3e980f5"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "ef1621f8-9714-47b2-ba2f-2202b3e980f5"}}	2026-09-19 22:58:59.631179-06
49437b77-69af-4a93-afa9-a3428973ef4f	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_CREADO	{"id": "188eff3c-9e6b-4983-b874-066a20aea0d1", "nombre": "Pruebas d675ccb4"}	2026-09-19 23:00:02.306525-06
a461de16-5293-412c-a8ad-67b649a06372	c14d57d5-3987-4dd9-8b10-44ef3985f68e	fbc2a3b0-3291-43f6-a5bc-c28233ceb870	USUARIO_ACTUALIZADO	{"antes": {"id": "fbc2a3b0-3291-43f6-a5bc-c28233ceb870", "rol": "MIEMBRO", "nombre": "Miembro de prueba", "departamentoId": "188eff3c-9e6b-4983-b874-066a20aea0d1"}, "despues": {"rol": "MIEMBRO", "nombre": "Miembro actualizado", "departamentoId": "188eff3c-9e6b-4983-b874-066a20aea0d1"}}	2026-09-19 23:00:02.582471-06
e2a7bd76-0e4b-4403-b447-b428d8d7697e	c14d57d5-3987-4dd9-8b10-44ef3985f68e	\N	DEPARTAMENTO_ACTUALIZADO	{"id": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8", "antes": {"activo": true, "nombre": "Pruebas d08bb14e"}, "despues": {"activo": true, "nombre": "Pruebas d08bb14e actualizado"}}	2026-09-19 23:03:10.725113-06
9c870f2a-7c8e-4cbc-80b1-1e7f4ae6a8e6	c14d57d5-3987-4dd9-8b10-44ef3985f68e	006972c7-6ff6-48d7-82d1-3959f6c7107a	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "miembro-d08bb14e@tezcat.local", "departamentoId": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8"}	2026-09-19 23:03:10.812864-06
e54ae1b1-b397-443e-88b6-5085ed3e76df	c14d57d5-3987-4dd9-8b10-44ef3985f68e	006972c7-6ff6-48d7-82d1-3959f6c7107a	USUARIO_DESACTIVADO	{}	2026-09-19 23:03:11.131532-06
6284fafb-9a1b-4ac7-8468-dac27c1ff2ce	c14d57d5-3987-4dd9-8b10-44ef3985f68e	6afd4a47-c460-4806-9472-9e9d9a44d6f1	USUARIO_CREADO	{"rol": "MIEMBRO", "email": "bloqueo-d08bb14e@tezcat.local", "departamentoId": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8"}	2026-09-19 23:03:11.23419-06
bb96a14d-6a51-4a27-8759-28c4e3fc1d43	c14d57d5-3987-4dd9-8b10-44ef3985f68e	356b407e-d6f7-493b-899f-de07bcaefe25	USUARIO_CREADO	{"rol": "ENCARGADO", "email": "encargado-d08bb14e@tezcat.local", "departamentoId": "9d0a83c3-6bd3-4a91-890e-e7dd9060afc8"}	2026-09-19 23:03:11.686545-06
\.


--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sesiones (id, usuario_id, token_hash, expira_en, creada_en) FROM stdin;
8aee6794-f6eb-405d-82be-b7591ebd237c	c14d57d5-3987-4dd9-8b10-44ef3985f68e	b52da2bb236a7a6a3a769c0aba356bd7e11b6fad87dcbf36ec5e3c4d6f33c101	2026-09-26 22:41:57.222-06	2026-09-19 22:41:57.224795-06
ddedf93c-ceea-4545-a6b1-3865bedc1fe2	c14d57d5-3987-4dd9-8b10-44ef3985f68e	2b599611ebe8d171d282867efe396f66e41493ea6ca601c09762efb52d5dcf50	2026-09-26 22:42:04.549-06	2026-09-19 22:42:04.550113-06
26bac2cf-e5ff-4948-806e-48d0d34cf805	c14d57d5-3987-4dd9-8b10-44ef3985f68e	c7dcc501d75b28a44b679fac7f6f161edb5efe80a90aa7a4098e92b061fbb8e0	2026-09-26 22:42:14.248-06	2026-09-19 22:42:14.2488-06
23b3a79e-7116-46f9-8f31-8bfb9d5464eb	c14d57d5-3987-4dd9-8b10-44ef3985f68e	11fcd471f7a40da6f7e1a37a5c97e64b510f528325d450a39976eb158d26a004	2026-09-26 22:42:24.905-06	2026-09-19 22:42:24.906083-06
7ba94374-a59b-45c5-9584-948e0b84d60c	9a509515-e10e-43ed-9e99-8f6d2cd4daeb	d91c6ff2ddf7d3742e7681fd267276def0b7465400b1dcde003c6606b4200aab	2026-09-26 22:42:25.876-06	2026-09-19 22:42:25.877158-06
ba8afab8-684d-45e2-a7c7-c55d6509624b	1ce9ceb6-e1c1-4bcc-8e7b-14ca6cbe9dc3	280ba85ce31c92217b14db9f5bec2dbf434399ebc80ea747023dbf290c9ee853	2026-09-26 22:42:26.551-06	2026-09-19 22:42:26.551952-06
da5e7e99-192b-4e4f-a2df-4499970d9356	c14d57d5-3987-4dd9-8b10-44ef3985f68e	596cdca40fde5c7d1f5c0f2993725697b2f95db56a69f773580d6f838c1dbce9	2026-09-26 22:44:09.485-06	2026-09-19 22:44:09.487329-06
91a8d881-d839-4148-8042-b3f1e20b9575	464f78f2-1d9a-46a4-9841-7ecc931f2ad7	7916a996ae5056c5b80d16bac7b4f8236066a2b311fcf0d480f37330d912b569	2026-09-26 22:44:10.105-06	2026-09-19 22:44:10.107651-06
3ada2e88-49ce-4c0d-b1db-0365d5acfb92	57f82ad4-3275-4aa7-aa8a-18613b197a69	754f659bc1740fd83a1caab17c069cf006d38c1b9e678fa03a30113e0199703f	2026-09-26 22:44:10.711-06	2026-09-19 22:44:10.71328-06
2fdd0176-3084-4f22-a6ed-5d43d8b867a9	c14d57d5-3987-4dd9-8b10-44ef3985f68e	a6a7f2016808f94e61f4a8d4b8132dbe3b135869fef4749bb16f1c88c12d70bd	2026-09-26 22:48:02.501-06	2026-09-19 22:48:02.502413-06
10470d0b-5d6d-4f45-88d2-a4dc2b49b061	96f09d10-779b-40e6-bdc7-53adcef11a03	6767f87f107115c42bd3990308d8fec224beb87cb07f7f9a6d1d908ff1d1d931	2026-09-26 22:48:03.191-06	2026-09-19 22:48:03.192389-06
7e855746-47d5-4101-9cdf-aed36d70e44c	4e4e521a-5c7a-4e99-bfb2-b0936622554a	b597b6355345af9136eb6c8ec0bc45de0c8b2022b39c36b48da7c58db76cbb8f	2026-09-26 22:48:03.816-06	2026-09-19 22:48:03.817558-06
83ee3461-2a7e-4797-8f85-5c9aca1ef35a	c14d57d5-3987-4dd9-8b10-44ef3985f68e	070fff5d1653eb878d1ce118d5a4577bc01473deb9d8f738a755f47994729dc1	2026-09-26 22:49:13.591-06	2026-09-19 22:49:13.592723-06
030dbf56-0e1b-4236-a9b4-057b94fdc44c	b8e72cdd-30d6-43a5-86c0-a7f42fd0c718	e00c1ad113238d6a7aece76642aafc5528a50a7ae8340906afbf429a0380cd60	2026-09-26 22:49:14.287-06	2026-09-19 22:49:14.288411-06
9a4e7c9e-3130-4c10-a242-e43b25e7c77d	c1c3a85c-0ff1-413e-bcf5-364722aaf48d	a0ca81255203328760f88395ee0b49e620193a9d0be3f7605dbccb4ffb116d3f	2026-09-26 22:49:15.071-06	2026-09-19 22:49:15.072843-06
fd742452-c6f0-4cb7-8511-c8037b5b373c	f18a4c16-2dd6-4505-ba8d-0e4d83dbdc0c	7e025050707eed6d5f09c797b90c102608b4200fcafb63bbdef4d4c376008562	2026-09-26 22:56:14.089-06	2026-09-19 22:56:14.090555-06
0a4671e3-dbc2-477e-970a-ed1d7d2e8d4b	c14d57d5-3987-4dd9-8b10-44ef3985f68e	34efe71b6f156b868c3faa6200102f28cf38b3e8f9627a32d716960261f694ab	2026-09-26 22:57:34.123-06	2026-09-19 22:57:34.124631-06
dc106a8c-fe07-4066-a429-ba4190540bba	8c0d0472-9080-4aa4-8715-34510e8dea0a	6aa33448c5f69a0da4ea92df4f5418b40d22097c70c3d9e22c213dff451fb46f	2026-09-26 22:57:35.186-06	2026-09-19 22:57:35.187873-06
1446119c-344b-46b9-b3ec-f675ef5dc7b5	4c38a20d-25ec-4ff1-b996-e0d2efd45bce	17102bfe4a81f071e45bc013af8e6cb348ef528a18e7e8d8a2f8006bfe2e1147	2026-09-26 22:57:36.388-06	2026-09-19 22:57:36.389671-06
0cf30a84-ff19-4603-a750-485bd84618c1	c14d57d5-3987-4dd9-8b10-44ef3985f68e	3314e7b9758cddd7ba1332438a82806d108639c6fd626cf2466072e5f8dc1a53	2026-09-26 22:58:59.261-06	2026-09-19 22:58:59.263237-06
e432ce58-e2c8-49a8-bdec-91b7374f7ca4	e57ef735-7409-4f79-b577-0899b48c5c80	5cfeff6a688f1c81e5f936472663279dac666c1860124519ef37886a7e3c9a2f	2026-09-26 22:58:59.905-06	2026-09-19 22:58:59.90647-06
4e435f0d-1b18-4d37-a2b5-f4b7bb2ae456	58da5740-1198-4717-bd5e-2be8805ed547	0d8f6b0ba2d2dee968374932d9026abdb2f2e54445fcef435a864bd57381ef60	2026-09-26 22:59:00.656-06	2026-09-19 22:59:00.657733-06
b8db755f-0547-4ca2-b2ad-b8689d2b95cf	f18a4c16-2dd6-4505-ba8d-0e4d83dbdc0c	cd8b3c72b459ba0ac90ca06ab3a13ed662b7d6fddb010fedec87fdc698626a16	2026-09-26 22:59:48.879-06	2026-09-19 22:59:48.880634-06
89a32ef7-ca39-43cd-96c4-0ba4d4dda8b9	c14d57d5-3987-4dd9-8b10-44ef3985f68e	c4fce85f825a72c7da5d4795d7cb725724cdffcab5beec6f786fb0b9c5b3f343	2026-09-26 23:00:02.06-06	2026-09-19 23:00:02.061724-06
9d9ea596-a732-4cd3-abcc-92d53f4c730c	fbc2a3b0-3291-43f6-a5bc-c28233ceb870	e194e39cdc3732a294f5f68acb40397ba75748c74dec55b2cdc7f973e9981d61	2026-09-26 23:00:02.825-06	2026-09-19 23:00:02.825955-06
e65f0768-e7d4-4651-b7c9-3a0fbf5a1895	afef5f7f-e766-40ac-a579-e97a968138a3	687ce13f7d297ff44fb07e072fcd89e99c5ae7347d644408d49eeb96146ee9f2	2026-09-26 23:00:03.649-06	2026-09-19 23:00:03.680474-06
aaba7627-4f94-4776-9017-142f7d90107a	c14d57d5-3987-4dd9-8b10-44ef3985f68e	93fc173b4bd9379013e808ecfa554dcfab8fffcb537e2d77dca02b70dbc0c602	2026-09-26 23:03:10.41-06	2026-09-19 23:03:10.411714-06
51ec9027-6f7f-43e1-98ee-ca6a650c6e53	006972c7-6ff6-48d7-82d1-3959f6c7107a	ef18b625f8700490c18c0944d625152bbf1078e5f63919c0976c30e699092f9b	2026-09-26 23:03:11.115-06	2026-09-19 23:03:11.116596-06
5cfd17f5-eba1-46e0-a236-ea3cc46113a7	356b407e-d6f7-493b-899f-de07bcaefe25	7c0083b5e32bfa6a6563e15fa2de1626cd3fa118214d77dd5efcd94141b1b5af	2026-09-26 23:03:11.768-06	2026-09-19 23:03:11.769965-06
\.


--
-- PostgreSQL database dump complete
--

\unrestrict eOOkMvJl4bTl9mfRCnOcWpcsHOKGrvrNA89B2jwgz3340XGtMFdxVwjWyM7mkhg

