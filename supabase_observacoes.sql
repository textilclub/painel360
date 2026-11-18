-- OBSERVAÇÕES DA TÊXTIL CLUB (escritas pelo administrador, lidas pela empresa)
create table if not exists public.observacoes (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  participante_id uuid references public.participantes(id) on delete cascade,
  alvo            text not null default 'geral',
  texto           text not null check (length(texto) between 1 and 4000),
  autor           text not null default 'Têxtil Club',
  admin_email     text default (auth.jwt() ->> 'email'),
  criado_em       timestamptz not null default now()
);
create index if not exists observacoes_empresa_idx on public.observacoes (empresa_id, criado_em desc);
alter table public.observacoes enable row level security;
revoke all on public.observacoes from anon, authenticated;
grant insert, delete on public.observacoes to authenticated;
grant select (id, empresa_id, participante_id, alvo, texto, autor, criado_em) on public.observacoes to authenticated;

drop policy if exists "obs: ver" on public.observacoes;
drop policy if exists "obs: criar" on public.observacoes;
drop policy if exists "obs: apagar" on public.observacoes;
create policy "obs: ver" on public.observacoes for select to authenticated
  using (empresa_id = public.minha_empresa() or public.is_admin());
create policy "obs: criar" on public.observacoes for insert to authenticated
  with check (public.is_admin());
create policy "obs: apagar" on public.observacoes for delete to authenticated
  using (public.is_admin());

select 'ok' as resultado;
