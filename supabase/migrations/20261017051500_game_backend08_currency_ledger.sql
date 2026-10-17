create table public.account_currency_balances (
  account_id uuid not null references public.accounts(id) on delete cascade,
  currency_definition_id text not null check (
    char_length(currency_definition_id) between 1 and 128
    and currency_definition_id = btrim(currency_definition_id)
  ),
  schema_version smallint not null default 1 check (schema_version = 1),
  balance bigint not null check (balance between 0 and 9007199254740991),
  revision bigint not null check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  primary key (account_id, currency_definition_id)
);

create table public.account_currency_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  currency_definition_id text not null check (
    char_length(currency_definition_id) between 1 and 128
    and currency_definition_id = btrim(currency_definition_id)
  ),
  schema_version smallint not null default 1 check (schema_version = 1),
  delta bigint not null check (
    delta between -9007199254740991 and 9007199254740991
    and delta <> 0
  ),
  balance_after bigint not null check (balance_after between 0 and 9007199254740991),
  balance_revision bigint not null check (balance_revision between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  unique (account_id, currency_definition_id, balance_revision)
);

alter table public.account_currency_balances enable row level security;
alter table public.account_currency_ledger enable row level security;

revoke all on table public.account_currency_balances from public, anon, authenticated;
revoke all on table public.account_currency_ledger from public, anon, authenticated;

grant select on table public.account_currency_balances to authenticated;
grant select on table public.account_currency_ledger to authenticated;

grant select, insert, update on table public.account_currency_balances to service_role;
grant select, insert on table public.account_currency_ledger to service_role;

create policy account_currency_balances_select_own
on public.account_currency_balances
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy account_currency_ledger_select_own
on public.account_currency_ledger
for select
to authenticated
using ((select auth.uid()) = account_id);

create or replace function private.apply_currency_delta(
  p_account_id uuid,
  p_currency_definition_id text,
  p_delta bigint
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_currency_definition_id text := btrim(p_currency_definition_id);
  v_balance bigint;
  v_revision bigint;
  v_new_balance numeric;
  v_new_revision bigint;
  v_entry_id uuid;
begin
  if p_account_id is null then
    raise exception 'account id is required' using errcode = '22023';
  end if;

  if v_currency_definition_id is null
    or char_length(v_currency_definition_id) not between 1 and 128
  then
    raise exception 'currency definition id must be 1 to 128 characters' using errcode = '22023';
  end if;

  if p_delta is null or p_delta = 0 or p_delta < -9007199254740991 or p_delta > 9007199254740991 then
    raise exception 'currency delta must be a non-zero JavaScript-safe integer' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_account_id::text || ':' || v_currency_definition_id,
      0
    )
  );

  select b.balance, b.revision
  into v_balance, v_revision
  from public.account_currency_balances as b
  where b.account_id = p_account_id
    and b.currency_definition_id = v_currency_definition_id
  for update;

  if found then
    v_new_balance := v_balance::numeric + p_delta::numeric;
    if v_new_balance < 0 then
      raise exception 'insufficient currency balance' using errcode = '22003';
    end if;
    if v_new_balance > 9007199254740991 then
      raise exception 'currency balance exceeds JavaScript safe integer range' using errcode = '22003';
    end if;
    if v_revision >= 9007199254740991 then
      raise exception 'currency balance revision exceeds JavaScript safe integer range' using errcode = '22003';
    end if;

    v_new_revision := v_revision + 1;
    update public.account_currency_balances
    set balance = v_new_balance::bigint,
        revision = v_new_revision,
        updated_at = now()
    where account_id = p_account_id
      and currency_definition_id = v_currency_definition_id;
  else
    if p_delta < 0 then
      raise exception 'insufficient currency balance' using errcode = '22003';
    end if;
    v_new_balance := p_delta::numeric;
    v_new_revision := 1;

    insert into public.account_currency_balances (
      account_id,
      currency_definition_id,
      balance,
      revision
    ) values (
      p_account_id,
      v_currency_definition_id,
      v_new_balance::bigint,
      v_new_revision
    );
  end if;

  insert into public.account_currency_ledger (
    account_id,
    currency_definition_id,
    delta,
    balance_after,
    balance_revision
  ) values (
    p_account_id,
    v_currency_definition_id,
    p_delta,
    v_new_balance::bigint,
    v_new_revision
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function private.apply_currency_delta(uuid, text, bigint)
from public, anon, authenticated;
grant execute on function private.apply_currency_delta(uuid, text, bigint)
to service_role;
