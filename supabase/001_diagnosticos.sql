-- ============================================================================
-- 001_diagnosticos.sql — Esquema y permisos del diagnóstico COMEEN
-- ----------------------------------------------------------------------------
-- Ejecutar completo en el SQL Editor de Supabase.
--
-- LA IDEA, EN UNA LÍNEA: quien diligencia la encuesta no se autentica y solo
-- puede INSERTAR; quien consulta el panel se autentica y puede todo. No hay
-- tabla de roles ni columna 'rol': con una sola cuenta creada y el registro
-- público desactivado, 'authenticated' ES el administrador.
--
-- DESPUÉS DE EJECUTAR ESTO, HACER DOS COSAS EN EL TABLERO DE SUPABASE:
--   1. Authentication → Providers → Email → desactivar "Enable sign-ups".
--      Sin esto, cualquiera podría crearse una cuenta y quedar como
--      administrador: es lo único que sostiene todo el modelo de permisos.
--   2. Authentication → Users → "Add user" con su correo y contraseña.
-- ============================================================================

create table if not exists public.diagnosticos (
  id                  text primary key,
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now(),
  version_instrumento text        not null,

  -- 'publico' (lo llenó el comerciante) | 'campo' (lo levantó COMEEN) | 'ejemplo'
  origen              text        not null default 'publico',

  -- Columnas derivadas: existen para filtrar, ordenar y graficar en SQL sin
  -- abrir el json en cada consulta.
  negocio_nombre      text        not null,
  categoria           text,
  municipio           text,
  barrio              text,
  nivel               smallint    not null check (nivel between 1 and 3),
  puntaje             smallint    not null check (puntaje between 0 and 24),
  pago                text,
  estado              text        not null default 'pendiente',

  -- La verdad completa del diagnóstico, tal como la produce la aplicación.
  -- Es jsonb a propósito: los cortes de nivel y las preguntas se van a
  -- recalibrar, y el json absorbe la nueva forma sin migrar la tabla.
  datos               jsonb       not null
);

comment on table public.diagnosticos is
  'Diagnósticos de presencia digital de negocios de comida. Una fila por levantamiento.';
comment on column public.diagnosticos.datos is
  'Registro completo. Las columnas de arriba son copias derivadas para consulta.';

-- Índices para las consultas que realmente hace el panel.
create index if not exists diagnosticos_creado_idx    on public.diagnosticos (creado desc);
create index if not exists diagnosticos_nivel_idx     on public.diagnosticos (nivel);
create index if not exists diagnosticos_estado_idx    on public.diagnosticos (estado);
create index if not exists diagnosticos_categoria_idx on public.diagnosticos (categoria);

-- 'actualizado' se pone solo: que no dependa de que el cliente lo mande bien.
create or replace function public.tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists diagnosticos_tocar_actualizado on public.diagnosticos;
create trigger diagnosticos_tocar_actualizado
  before update on public.diagnosticos
  for each row execute function public.tocar_actualizado();


-- ============================================================================
-- PERMISOS
-- ============================================================================

alter table public.diagnosticos enable row level security;

-- Punto de partida: nadie puede nada. Lo que sigue abre lo mínimo.
revoke all on public.diagnosticos from anon, authenticated;
grant insert on public.diagnosticos to anon;
grant select, insert, update, delete on public.diagnosticos to authenticated;

-- Anónimo: puede dejar un diagnóstico y nada más.
drop policy if exists diagnosticos_insert_anon on public.diagnosticos;
create policy diagnosticos_insert_anon
  on public.diagnosticos for insert to anon
  with check (true);

-- OJO: no existe política de SELECT para 'anon'. Eso es deliberado y es lo que
-- hace que la llave pública del navegador no sirva para leer la base. Si algún
-- día se agrega una, cualquiera podría descargar los datos de contacto de
-- todos los negocios.

-- Administrador: todo.
drop policy if exists diagnosticos_admin_all on public.diagnosticos;
create policy diagnosticos_admin_all
  on public.diagnosticos for all to authenticated
  using (true) with check (true);


-- ============================================================================
-- CONSULTAS ÚTILES
-- ============================================================================

-- Distribución por nivel: es la que sirve para recalibrar los cortes
-- (0–9 / 10–17 / 18–24) cuando haya 30–50 negocios levantados.
--
--   select nivel, count(*), round(avg(puntaje), 1) as puntaje_promedio
--   from public.diagnosticos where origen <> 'ejemplo'
--   group by nivel order by nivel;
--
-- Histograma de puntajes, para ver dónde caen de verdad los negocios:
--
--   select puntaje, count(*) from public.diagnosticos
--   where origen <> 'ejemplo' group by puntaje order by puntaje;
--
-- Servicios más recomendados, leyendo dentro del json:
--
--   select servicio, count(*) from public.diagnosticos,
--        lateral jsonb_array_elements_text(datos -> 'prioridades') as servicio
--   where origen <> 'ejemplo' group by servicio order by count(*) desc;
