create policy trusted_command_receipts_service_access
on private.trusted_command_receipts
for all
to service_role
using (true)
with check (true);
