-- Image Slot Lineage V1 local rehearsal provisioning helper.
--
-- Required psql variables:
--   role_name
--   database_name
--
-- Required process environment:
--   IMAGE_LINEAGE_REHEARSAL_SECRET_FILE
--
-- The secret file must be outside the repository and readable only by the
-- PostgreSQL OS account. The password is never echoed by this script.

\set ON_ERROR_STOP on

\if :{?role_name}
\else
  \echo 'missing required psql variable: role_name'
  \quit 2
\endif

\if :{?database_name}
\else
  \echo 'missing required psql variable: database_name'
  \quit 2
\endif

\set rehearsal_password `cat "$IMAGE_LINEAGE_REHEARSAL_SECRET_FILE"`

SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5',
  :'role_name',
  :'rehearsal_password'
) \gexec

SELECT format(
  'CREATE DATABASE %I OWNER %I TEMPLATE template0 ENCODING ''UTF8''',
  :'database_name',
  :'role_name'
) \gexec

-- PostgreSQL grants CONNECT to PUBLIC on a new database by default. Restrict
-- only the task-created database, leaving every other database ACL untouched.
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'database_name') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'role_name') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO postgres', :'database_name') \gexec
