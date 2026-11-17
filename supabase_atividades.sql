-- ATIVIDADES DA IMERSÃO (uma por participante e por tipo). Ex.: tipo = 'visita'
create table if not exists public.atividades (
  participante_id uuid not null references public.participantes(id) on delete cascade,
  tipo            text not null,
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  dados           jsonb not null default '{}'::jsonb,
  status          text not null default 'rascunho' check (status in ('rascunho','concluido')),
  atualizado_em   timestamptz not null default now(),
  primary key (participante_id, tipo)
);
alter table public.atividades enable row level security;

drop policy if exists "at: ver" on public.atividades;
drop policy if exists "at: criar" on public.atividades;
drop policy if exists "at: editar" on public.atividades;

create policy "at: ver" on public.atividades for select to authenticated
  using (participante_id = auth.uid() or empresa_id = public.minha_empresa() or public.is_admin());
create policy "at: criar" on public.atividades for insert to authenticated
  with check (participante_id = auth.uid() and empresa_id = public.minha_empresa() and public.sou_aprovado());
create policy "at: editar" on public.atividades for update to authenticated
  using (participante_id = auth.uid() and public.sou_aprovado())
  with check (participante_id = auth.uid() and empresa_id = public.minha_empresa() and public.sou_aprovado());

select 'ok' as resultado;
