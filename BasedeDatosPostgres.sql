--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

-- Started on 2025-10-22 10:05:20

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
-- TOC entry 884 (class 1247 OID 27273)
-- Name: estado_incidente; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_incidente AS ENUM (
    'pendiente',
    'asignado',
    'en_proceso',
    'resuelto',
    'rechazado',
    'eliminado'
);


ALTER TYPE public.estado_incidente OWNER TO postgres;

--
-- TOC entry 887 (class 1247 OID 27286)
-- Name: estado_tarea; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.estado_tarea AS ENUM (
    'pendiente',
    'en_progreso',
    'completada',
    'cancelada'
);


ALTER TYPE public.estado_tarea OWNER TO postgres;

--
-- TOC entry 890 (class 1247 OID 27296)
-- Name: gravedad_incidente; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gravedad_incidente AS ENUM (
    'baja',
    'media',
    'alta',
    'critica'
);


ALTER TYPE public.gravedad_incidente OWNER TO postgres;

--
-- TOC entry 893 (class 1247 OID 27306)
-- Name: tipo_incidente; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_incidente AS ENUM (
    'electrico',
    'hidraulico',
    'sanitaria',
    'mantenimiento',
    'otro'
);


ALTER TYPE public.tipo_incidente OWNER TO postgres;

--
-- TOC entry 252 (class 1255 OID 27317)
-- Name: actualizar_estado_mantenimiento(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_estado_mantenimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- DEBUG: Mostrar informaci¢n del registro al activarse el trigger
    RAISE NOTICE 'DEBUG: id=% estado_actual=% estado_nuevo=% fecha_programada=% dias=%',
        NEW.id, OLD.estado, NEW.estado, NEW.fecha_programada, NEW.dias;

    -- Solo forzar a 'pendiente' si no se cambi¢ manualmente a otro estado
    IF NEW.estado = OLD.estado THEN
        IF (CURRENT_DATE >= NEW.fecha_programada - NEW.dias) THEN
            NEW.estado := 'pendiente';
            RAISE NOTICE 'Estado forzado a pendiente para id=%', NEW.id;
        END IF;
    ELSE
        -- Si el estado fue modificado manualmente, no se sobrescribe
        RAISE NOTICE 'Estado manual detectado para id=%, no se modifica', NEW.id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_estado_mantenimiento() OWNER TO postgres;

--
-- TOC entry 253 (class 1255 OID 27318)
-- Name: actualizar_operario_incidente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_operario_incidente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Actualizamos operario y fecha asignaci¢n
  UPDATE incidente
  SET operario_id = (
        SELECT usuario_id
        FROM responsables
        WHERE id = NEW.responsable_id
      ),
      fecha_asignacion = NEW.fecha_asignacion,
      -- Si el estado pasa a 'resuelto', guardamos la fecha de cierre
      fecha_cierre = CASE 
                        WHEN NEW.estado_asignacion = 'resuelto' THEN NOW()
                        ELSE fecha_cierre
                     END,
      -- Tambi‚n actualizamos el estado del incidente si aplica
      estado = CASE
                  WHEN NEW.estado_asignacion = 'resuelto' THEN 'resuelto'
                  ELSE estado
               END
  WHERE id = NEW.incidente_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_operario_incidente() OWNER TO postgres;

--
-- TOC entry 254 (class 1255 OID 27319)
-- Name: fn_sincronizar_responsable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_sincronizar_responsable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Cuando se INSERTA un nuevo usuario con rol_id = 3
    IF (TG_OP = 'INSERT' AND NEW.rol_id = 3) THEN
        INSERT INTO responsables (usuario_id, especialidad, activo)
        VALUES (NEW.id, 'General', true);
    
    -- Cuando se ACTUALIZA un usuario a rol_id = 3
    ELSIF (TG_OP = 'UPDATE' AND NEW.rol_id = 3 AND OLD.rol_id != 3) THEN
        INSERT INTO responsables (usuario_id, especialidad, activo)
        VALUES (NEW.id, 'General', true)
        ON CONFLICT (usuario_id) DO NOTHING;
    
    -- Cuando se cambia de rol_id 3 a otro valor
    ELSIF (TG_OP = 'UPDATE' AND NEW.rol_id != 3 AND OLD.rol_id = 3) THEN
        DELETE FROM responsables WHERE usuario_id = OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_sincronizar_responsable() OWNER TO postgres;

--
-- TOC entry 255 (class 1255 OID 27320)
-- Name: generar_nombre_ubicacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generar_nombre_ubicacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.bloque IS NOT NULL THEN
        NEW.nombre := 'Bloque ' || NEW.bloque || ', Piso ' || NEW.piso || ', Sal¢n ' || NEW.salon;
    ELSIF NEW.area IS NOT NULL THEN
        NEW.nombre := NEW.area;
    ELSE
        NEW.nombre := 'Sin ubicaci¢n definida';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generar_nombre_ubicacion() OWNER TO postgres;

--
-- TOC entry 256 (class 1255 OID 27321)
-- Name: gestionar_fechas_incidente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.gestionar_fechas_incidente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Si es una nueva fila, establece la fecha de creaci¢n
  IF TG_OP = 'INSERT' THEN
    NEW.fecha_creacion := NOW();
  END IF;

  -- Si es una actualizaci¢n...
  IF TG_OP = 'UPDATE' THEN
    -- Si cambia de cualquier estado a 'asignado' y no ten¡a fecha_asignacion
    IF NEW.estado = 'asignado' AND OLD.estado IS DISTINCT FROM 'asignado' AND NEW.fecha_asignacion IS NULL THEN
      NEW.fecha_asignacion := NOW();
    END IF;

    -- Si cambia de cualquier estado a 'resuelto' y no ten¡a fecha_cierre
    IF NEW.estado = 'resuelto' AND OLD.estado IS DISTINCT FROM 'resuelto' AND NEW.fecha_cierre IS NULL THEN
      NEW.fecha_cierre := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.gestionar_fechas_incidente() OWNER TO postgres;

--
-- TOC entry 257 (class 1255 OID 27322)
-- Name: insertar_historial_incidente(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insertar_historial_incidente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial_incidentes (
      incidente_id,
      estado_anterior,
      estado_nuevo,
      descripcion_anterior,
      descripcion_nueva,
      usuario_id,
      accion
    ) VALUES (
      NEW.id,
      NULL,
      NEW.estado,
      NULL,
      NEW.descripcion,
      NULL,  -- aqu¡ puedes poner usuario si lo tienes en contexto
      'INSERT'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO historial_incidentes (
      incidente_id,
      estado_anterior,
      estado_nuevo,
      descripcion_anterior,
      descripcion_nueva,
      usuario_id,
      accion
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      OLD.descripcion,
      NEW.descripcion,
      NULL, -- usuario, si puedes pasar el id por contexto o sesi¢n
      'UPDATE'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.insertar_historial_incidente() OWNER TO postgres;

--
-- TOC entry 258 (class 1255 OID 27323)
-- Name: limpiar_password_resets_expirados(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.limpiar_password_resets_expirados() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM password_resets
  WHERE expiracion < NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.limpiar_password_resets_expirados() OWNER TO postgres;

--
-- TOC entry 259 (class 1255 OID 27324)
-- Name: sync_estado_asignacion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_estado_asignacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Actualizar el estado del incidente relacionado
    UPDATE incidente
    SET estado = NEW.estado_asignacion::estado_incidente
    WHERE id = NEW.incidente_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_estado_asignacion() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 27325)
-- Name: asignaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asignaciones (
    id integer NOT NULL,
    incidente_id integer,
    responsable_id integer,
    fecha_asignacion timestamp without time zone DEFAULT now(),
    estado_asignacion text DEFAULT 'pendiente'::text,
    comentarios text
);


ALTER TABLE public.asignaciones OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 27332)
-- Name: asignaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.asignaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.asignaciones_id_seq OWNER TO postgres;

--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 216
-- Name: asignaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.asignaciones_id_seq OWNED BY public.asignaciones.id;


--
-- TOC entry 217 (class 1259 OID 27333)
-- Name: categorias_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias_items (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text
);


ALTER TABLE public.categorias_items OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 27338)
-- Name: categorias_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_items_id_seq OWNER TO postgres;

--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 218
-- Name: categorias_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_items_id_seq OWNED BY public.categorias_items.id;


--
-- TOC entry 219 (class 1259 OID 27339)
-- Name: componente_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.componente_items (
    id integer NOT NULL,
    componente_id integer,
    item_id integer,
    cantidad integer DEFAULT 1 NOT NULL,
    CONSTRAINT componente_items_cantidad_check CHECK ((cantidad > 0))
);


ALTER TABLE public.componente_items OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 27344)
-- Name: componente_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.componente_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.componente_items_id_seq OWNER TO postgres;

--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 220
-- Name: componente_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.componente_items_id_seq OWNED BY public.componente_items.id;


--
-- TOC entry 221 (class 1259 OID 27345)
-- Name: componentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.componentes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    numero_serie character varying(50),
    fecha_instalacion date,
    vida_util_meses integer,
    estado character varying(20) DEFAULT 'operativo'::character varying,
    imagen_url character varying(255),
    fecha_creacion timestamp without time zone DEFAULT now(),
    ubicacion_id integer,
    fecha_ultima_revision date,
    responsable_mantenimiento integer,
    componente_id integer,
    item_id integer
);


ALTER TABLE public.componentes OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 27352)
-- Name: componentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.componentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.componentes_id_seq OWNER TO postgres;

--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 222
-- Name: componentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.componentes_id_seq OWNED BY public.componentes.id;


--
-- TOC entry 223 (class 1259 OID 27353)
-- Name: historial_incidentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_incidentes (
    id integer NOT NULL,
    incidente_id integer NOT NULL,
    usuario_id integer NOT NULL,
    campo_modificado character varying(100) NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    fecha_modificacion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.historial_incidentes OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 27359)
-- Name: historial_incidentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_incidentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_incidentes_id_seq OWNER TO postgres;

--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 224
-- Name: historial_incidentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_incidentes_id_seq OWNED BY public.historial_incidentes.id;


--
-- TOC entry 225 (class 1259 OID 27360)
-- Name: imagenes_incidente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.imagenes_incidente (
    id integer NOT NULL,
    incidente_id integer,
    url text NOT NULL,
    descripcion text
);


ALTER TABLE public.imagenes_incidente OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 27365)
-- Name: imagenes_incidente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.imagenes_incidente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imagenes_incidente_id_seq OWNER TO postgres;

--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 226
-- Name: imagenes_incidente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.imagenes_incidente_id_seq OWNED BY public.imagenes_incidente.id;


--
-- TOC entry 227 (class 1259 OID 27366)
-- Name: incidente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incidente (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descripcion text,
    tipo public.tipo_incidente NOT NULL,
    ubicacion_id integer,
    gravedad public.gravedad_incidente NOT NULL,
    estado public.estado_incidente,
    solicitante_id integer NOT NULL,
    operario_id integer,
    supervisor_asignador_id integer,
    fecha_creacion timestamp with time zone DEFAULT now(),
    fecha_asignacion timestamp without time zone,
    fecha_cierre timestamp without time zone,
    acciones_tomadas text,
    tipo_tmp text
);


ALTER TABLE public.incidente OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 27372)
-- Name: incidente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incidente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incidente_id_seq OWNER TO postgres;

--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 228
-- Name: incidente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incidente_id_seq OWNED BY public.incidente.id;


--
-- TOC entry 229 (class 1259 OID 27373)
-- Name: inventario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    item_id integer,
    cantidad integer DEFAULT 0 NOT NULL,
    costo_unitario numeric(10,2),
    ubicacion_actual character varying(100),
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    CONSTRAINT inventario_cantidad_check CHECK ((cantidad >= 0))
);


ALTER TABLE public.inventario OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 27379)
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventario_id_seq OWNER TO postgres;

--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 230
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- TOC entry 231 (class 1259 OID 27380)
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    categoria_id integer,
    imagen_url character varying(255),
    ubicacion_default character varying(100),
    fecha_creacion timestamp without time zone DEFAULT now(),
    vida_util_meses integer
);


ALTER TABLE public.items OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 27386)
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 232
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- TOC entry 251 (class 1259 OID 27672)
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    accion text NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.logs OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 27671)
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_seq OWNER TO postgres;

--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 250
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- TOC entry 233 (class 1259 OID 27387)
-- Name: mantenimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mantenimientos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    frecuencia character varying(50),
    fecha_programada date,
    fecha_ultima_ejecucion timestamp without time zone,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    comentarios text,
    componente_id integer,
    operario_id integer,
    dias integer,
    ubicacion_id integer,
    CONSTRAINT chk_mantenimiento_tiene_ubicacion CHECK (((componente_id IS NOT NULL) OR (ubicacion_id IS NOT NULL)))
);


ALTER TABLE public.mantenimientos OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 27394)
-- Name: mantenimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mantenimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mantenimientos_id_seq OWNER TO postgres;

--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 234
-- Name: mantenimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mantenimientos_id_seq OWNED BY public.mantenimientos.id;


--
-- TOC entry 235 (class 1259 OID 27395)
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notificaciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    mensaje text NOT NULL,
    tipo character varying(50) NOT NULL,
    leida boolean DEFAULT false,
    fecha_creacion timestamp without time zone DEFAULT now(),
    fecha_lectura timestamp without time zone,
    link character varying(255)
);


ALTER TABLE public.notificaciones OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 27402)
-- Name: notificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notificaciones_id_seq OWNER TO postgres;

--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 236
-- Name: notificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notificaciones_id_seq OWNED BY public.notificaciones.id;


--
-- TOC entry 237 (class 1259 OID 27403)
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    token_hash character varying(255) NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL,
    expiracion timestamp without time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL,
    used boolean DEFAULT false NOT NULL
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 27409)
-- Name: password_resets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_resets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_resets_id_seq OWNER TO postgres;

--
-- TOC entry 5032 (class 0 OID 0)
-- Dependencies: 238
-- Name: password_resets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_resets_id_seq OWNED BY public.password_resets.id;


--
-- TOC entry 239 (class 1259 OID 27416)
-- Name: responsables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsables (
    id integer NOT NULL,
    usuario_id integer,
    especialidad text,
    activo boolean DEFAULT true
);


ALTER TABLE public.responsables OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 27422)
-- Name: responsables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.responsables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.responsables_id_seq OWNER TO postgres;

--
-- TOC entry 5033 (class 0 OID 0)
-- Dependencies: 240
-- Name: responsables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.responsables_id_seq OWNED BY public.responsables.id;


--
-- TOC entry 241 (class 1259 OID 27423)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 27431)
-- Name: solicitudadquisicion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudadquisicion (
    id integer NOT NULL,
    usuario_solicitante character varying(100) NOT NULL,
    item_solicitado character varying(255) NOT NULL,
    cantidad integer NOT NULL,
    estado_solicitud character varying(20) DEFAULT 'pendiente'::character varying,
    id_usuario_aprueba integer,
    fecha_solicitud timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_aprobacion timestamp without time zone,
    justificacion text,
    motivo_rechazo text,
    CONSTRAINT solicitudadquisicion_estado_solicitud_check CHECK (((estado_solicitud)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('aprobada'::character varying)::text, ('rechazada'::character varying)::text])))
);


ALTER TABLE public.solicitudadquisicion OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 27439)
-- Name: solicitudadquisicion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.solicitudadquisicion ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitudadquisicion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 244 (class 1259 OID 27440)
-- Name: ubicaciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ubicaciones (
    id integer NOT NULL,
    nombre character varying(100),
    area text,
    bloque text,
    piso text,
    salon text
);


ALTER TABLE public.ubicaciones OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 27445)
-- Name: ubicaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ubicaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ubicaciones_id_seq OWNER TO postgres;

--
-- TOC entry 5034 (class 0 OID 0)
-- Dependencies: 245
-- Name: ubicaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ubicaciones_id_seq OWNED BY public.ubicaciones.id;


--
-- TOC entry 246 (class 1259 OID 27446)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100),
    apellido character varying(100),
    telefono character varying(20),
    email character varying(255) NOT NULL,
    password text NOT NULL,
    rol_id integer,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 27452)
-- Name: usuarios_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_permisos (
    usuario_id integer NOT NULL,
    permiso_id integer NOT NULL,
    otorgado boolean NOT NULL
);


ALTER TABLE public.usuarios_permisos OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 27455)
-- Name: usuarios_temp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_temp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_temp_id_seq OWNER TO postgres;

--
-- TOC entry 5035 (class 0 OID 0)
-- Dependencies: 248
-- Name: usuarios_temp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_temp_id_seq OWNED BY public.usuarios.id;


--
-- TOC entry 249 (class 1259 OID 27456)
-- Name: vista_ubicaciones; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vista_ubicaciones AS
 SELECT id,
    area,
    bloque,
    piso,
    salon,
        CASE
            WHEN (bloque IS NOT NULL) THEN ((((('Bloque '::text || bloque) || ', Piso '::text) || piso) || ', Sal¢n '::text) || salon)
            WHEN (area IS NOT NULL) THEN area
            ELSE 'Sin ubicaci¢n definida'::text
        END AS nombre
   FROM public.ubicaciones;


ALTER VIEW public.vista_ubicaciones OWNER TO postgres;

--
-- TOC entry 4746 (class 2604 OID 27460)
-- Name: asignaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asignaciones ALTER COLUMN id SET DEFAULT nextval('public.asignaciones_id_seq'::regclass);


--
-- TOC entry 4749 (class 2604 OID 27461)
-- Name: categorias_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_items ALTER COLUMN id SET DEFAULT nextval('public.categorias_items_id_seq'::regclass);


--
-- TOC entry 4750 (class 2604 OID 27462)
-- Name: componente_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componente_items ALTER COLUMN id SET DEFAULT nextval('public.componente_items_id_seq'::regclass);


--
-- TOC entry 4752 (class 2604 OID 27463)
-- Name: componentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes ALTER COLUMN id SET DEFAULT nextval('public.componentes_id_seq'::regclass);


--
-- TOC entry 4755 (class 2604 OID 27464)
-- Name: historial_incidentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_incidentes ALTER COLUMN id SET DEFAULT nextval('public.historial_incidentes_id_seq'::regclass);


--
-- TOC entry 4757 (class 2604 OID 27465)
-- Name: imagenes_incidente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes_incidente ALTER COLUMN id SET DEFAULT nextval('public.imagenes_incidente_id_seq'::regclass);


--
-- TOC entry 4758 (class 2604 OID 27466)
-- Name: incidente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente ALTER COLUMN id SET DEFAULT nextval('public.incidente_id_seq'::regclass);


--
-- TOC entry 4760 (class 2604 OID 27467)
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- TOC entry 4763 (class 2604 OID 27468)
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- TOC entry 4781 (class 2604 OID 27675)
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- TOC entry 4765 (class 2604 OID 27469)
-- Name: mantenimientos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos ALTER COLUMN id SET DEFAULT nextval('public.mantenimientos_id_seq'::regclass);


--
-- TOC entry 4767 (class 2604 OID 27470)
-- Name: notificaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones ALTER COLUMN id SET DEFAULT nextval('public.notificaciones_id_seq'::regclass);


--
-- TOC entry 4770 (class 2604 OID 27471)
-- Name: password_resets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets ALTER COLUMN id SET DEFAULT nextval('public.password_resets_id_seq'::regclass);


--
-- TOC entry 4774 (class 2604 OID 27473)
-- Name: responsables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables ALTER COLUMN id SET DEFAULT nextval('public.responsables_id_seq'::regclass);


--
-- TOC entry 4778 (class 2604 OID 27474)
-- Name: ubicaciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones ALTER COLUMN id SET DEFAULT nextval('public.ubicaciones_id_seq'::regclass);


--
-- TOC entry 4779 (class 2604 OID 27475)
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_temp_id_seq'::regclass);


--
-- TOC entry 4788 (class 2606 OID 27477)
-- Name: asignaciones asignaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4790 (class 2606 OID 27479)
-- Name: categorias_items categorias_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_items
    ADD CONSTRAINT categorias_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4792 (class 2606 OID 27481)
-- Name: componente_items componente_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componente_items
    ADD CONSTRAINT componente_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4794 (class 2606 OID 27483)
-- Name: componentes componentes_numero_serie_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_numero_serie_key UNIQUE (numero_serie);


--
-- TOC entry 4796 (class 2606 OID 27485)
-- Name: componentes componentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_pkey PRIMARY KEY (id);


--
-- TOC entry 4798 (class 2606 OID 27487)
-- Name: historial_incidentes historial_incidentes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_incidentes
    ADD CONSTRAINT historial_incidentes_pkey PRIMARY KEY (id);


--
-- TOC entry 4800 (class 2606 OID 27489)
-- Name: imagenes_incidente imagenes_incidente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.imagenes_incidente
    ADD CONSTRAINT imagenes_incidente_pkey PRIMARY KEY (id);


--
-- TOC entry 4802 (class 2606 OID 27491)
-- Name: incidente incidente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente
    ADD CONSTRAINT incidente_pkey PRIMARY KEY (id);


--
-- TOC entry 4804 (class 2606 OID 27493)
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- TOC entry 4806 (class 2606 OID 27495)
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 27680)
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4808 (class 2606 OID 27497)
-- Name: mantenimientos mantenimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_pkey PRIMARY KEY (id);


--
-- TOC entry 4810 (class 2606 OID 27499)
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4814 (class 2606 OID 27501)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- TOC entry 4816 (class 2606 OID 27503)
-- Name: password_resets password_resets_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_token_key UNIQUE (token_hash);


--
-- TOC entry 4818 (class 2606 OID 27509)
-- Name: responsables responsables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_pkey PRIMARY KEY (id);


--
-- TOC entry 4820 (class 2606 OID 27511)
-- Name: responsables responsables_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_usuario_id_key UNIQUE (usuario_id);


--
-- TOC entry 4822 (class 2606 OID 27513)
-- Name: roles roles_nuevos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nuevos_nombre_key UNIQUE (nombre);


--
-- TOC entry 4824 (class 2606 OID 27515)
-- Name: roles roles_nuevos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nuevos_pkey PRIMARY KEY (id);


--
-- TOC entry 4826 (class 2606 OID 27519)
-- Name: solicitudadquisicion solicitudadquisicion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudadquisicion
    ADD CONSTRAINT solicitudadquisicion_pkey PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 27521)
-- Name: ubicaciones ubicaciones_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones
    ADD CONSTRAINT ubicaciones_nombre_key UNIQUE (nombre);


--
-- TOC entry 4830 (class 2606 OID 27523)
-- Name: ubicaciones ubicaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ubicaciones
    ADD CONSTRAINT ubicaciones_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 27525)
-- Name: usuarios_permisos usuarios_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_pkey PRIMARY KEY (usuario_id, permiso_id);


--
-- TOC entry 4832 (class 2606 OID 27527)
-- Name: usuarios usuarios_temp_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_temp_email_key UNIQUE (email);


--
-- TOC entry 4834 (class 2606 OID 27529)
-- Name: usuarios usuarios_temp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_temp_pkey PRIMARY KEY (id);


--
-- TOC entry 4811 (class 1259 OID 27530)
-- Name: idx_password_resets_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_token ON public.password_resets USING btree (token_hash);


--
-- TOC entry 4812 (class 1259 OID 27531)
-- Name: idx_password_resets_usuario_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_resets_usuario_id ON public.password_resets USING btree (usuario_id);


--
-- TOC entry 4866 (class 2620 OID 27532)
-- Name: mantenimientos trg_actualizar_estado_mantenimiento; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_actualizar_estado_mantenimiento BEFORE INSERT OR UPDATE ON public.mantenimientos FOR EACH ROW EXECUTE FUNCTION public.actualizar_estado_mantenimiento();


--
-- TOC entry 4863 (class 2620 OID 27533)
-- Name: asignaciones trg_actualizar_operario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_actualizar_operario AFTER INSERT OR UPDATE ON public.asignaciones FOR EACH ROW EXECUTE FUNCTION public.actualizar_operario_incidente();


--
-- TOC entry 4869 (class 2620 OID 27534)
-- Name: usuarios trg_after_insert_usuario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_after_insert_usuario AFTER INSERT ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_sincronizar_responsable();


--
-- TOC entry 4870 (class 2620 OID 27535)
-- Name: usuarios trg_after_update_usuario; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_after_update_usuario AFTER UPDATE OF rol_id ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.fn_sincronizar_responsable();


--
-- TOC entry 4867 (class 2620 OID 27536)
-- Name: password_resets trg_limpiar_password_resets; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_limpiar_password_resets AFTER INSERT ON public.password_resets FOR EACH STATEMENT EXECUTE FUNCTION public.limpiar_password_resets_expirados();


--
-- TOC entry 4864 (class 2620 OID 27537)
-- Name: asignaciones trg_sync_estado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sync_estado AFTER INSERT OR UPDATE OF estado_asignacion ON public.asignaciones FOR EACH ROW WHEN ((new.incidente_id IS NOT NULL)) EXECUTE FUNCTION public.sync_estado_asignacion();


--
-- TOC entry 4865 (class 2620 OID 27538)
-- Name: asignaciones trigger_actualizar_operario_update; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_operario_update AFTER UPDATE ON public.asignaciones FOR EACH ROW WHEN ((old.responsable_id IS DISTINCT FROM new.responsable_id)) EXECUTE FUNCTION public.actualizar_operario_incidente();


--
-- TOC entry 4868 (class 2620 OID 27539)
-- Name: ubicaciones trigger_generar_nombre; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_generar_nombre BEFORE INSERT OR UPDATE ON public.ubicaciones FOR EACH ROW EXECUTE FUNCTION public.generar_nombre_ubicacion();


--
-- TOC entry 4839 (class 2606 OID 27540)
-- Name: asignaciones asignaciones_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asignaciones
    ADD CONSTRAINT asignaciones_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.responsables(id);


--
-- TOC entry 4840 (class 2606 OID 27545)
-- Name: componente_items componente_items_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componente_items
    ADD CONSTRAINT componente_items_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES public.componentes(id) ON DELETE CASCADE;


--
-- TOC entry 4841 (class 2606 OID 27550)
-- Name: componente_items componente_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componente_items
    ADD CONSTRAINT componente_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- TOC entry 4842 (class 2606 OID 27555)
-- Name: componentes componentes_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES public.componentes(id) ON DELETE CASCADE;


--
-- TOC entry 4843 (class 2606 OID 27560)
-- Name: componentes componentes_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- TOC entry 4844 (class 2606 OID 27565)
-- Name: componentes componentes_responsable_mantenimiento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_responsable_mantenimiento_fkey FOREIGN KEY (responsable_mantenimiento) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 4845 (class 2606 OID 27570)
-- Name: componentes componentes_ubicacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.componentes
    ADD CONSTRAINT componentes_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones(id) ON DELETE SET NULL;


--
-- TOC entry 4857 (class 2606 OID 27575)
-- Name: notificaciones fk_usuario_notificacion; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT fk_usuario_notificacion FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 4846 (class 2606 OID 27580)
-- Name: historial_incidentes historial_incidentes_incidente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_incidentes
    ADD CONSTRAINT historial_incidentes_incidente_id_fkey FOREIGN KEY (incidente_id) REFERENCES public.incidente(id) ON DELETE CASCADE;


--
-- TOC entry 4847 (class 2606 OID 27585)
-- Name: historial_incidentes historial_incidentes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_incidentes
    ADD CONSTRAINT historial_incidentes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 4848 (class 2606 OID 27590)
-- Name: incidente incidente_operario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente
    ADD CONSTRAINT incidente_operario_id_fkey FOREIGN KEY (operario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 4849 (class 2606 OID 27595)
-- Name: incidente incidente_solicitante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente
    ADD CONSTRAINT incidente_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 4850 (class 2606 OID 27600)
-- Name: incidente incidente_supervisor_asignador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente
    ADD CONSTRAINT incidente_supervisor_asignador_id_fkey FOREIGN KEY (supervisor_asignador_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- TOC entry 4851 (class 2606 OID 27605)
-- Name: incidente incidente_ubicacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incidente
    ADD CONSTRAINT incidente_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones(id) ON DELETE SET NULL;


--
-- TOC entry 4852 (class 2606 OID 27610)
-- Name: inventario inventario_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- TOC entry 4853 (class 2606 OID 27615)
-- Name: items items_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_items(id);


--
-- TOC entry 4862 (class 2606 OID 27681)
-- Name: logs logs_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 4854 (class 2606 OID 27620)
-- Name: mantenimientos mantenimientos_componente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_componente_id_fkey FOREIGN KEY (componente_id) REFERENCES public.componentes(id) ON DELETE SET NULL;


--
-- TOC entry 4855 (class 2606 OID 27625)
-- Name: mantenimientos mantenimientos_operario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_operario_id_fkey FOREIGN KEY (operario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4856 (class 2606 OID 27630)
-- Name: mantenimientos mantenimientos_ubicacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES public.ubicaciones(id) ON DELETE SET NULL;


--
-- TOC entry 4858 (class 2606 OID 27635)
-- Name: password_resets password_resets_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- TOC entry 4859 (class 2606 OID 27640)
-- Name: responsables responsables_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsables
    ADD CONSTRAINT responsables_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- TOC entry 4860 (class 2606 OID 27655)
-- Name: solicitudadquisicion solicitudadquisicion_id_usuario_aprueba_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudadquisicion
    ADD CONSTRAINT solicitudadquisicion_id_usuario_aprueba_fkey FOREIGN KEY (id_usuario_aprueba) REFERENCES public.usuarios(id);


--
-- TOC entry 4861 (class 2606 OID 27665)
-- Name: usuarios_permisos usuarios_permisos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


-- Completed on 2025-10-22 10:05:21

--
-- PostgreSQL database dump complete
--

