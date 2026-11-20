-- Run after the one-time probe when pg_net was installed just for diagnostics.
-- Do not apply on projects where pg_net is already used by other services.
begin;
drop extension if exists pg_net;
commit;
