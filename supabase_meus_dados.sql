-- Edição do cadastro pelo próprio participante.
-- O participante só altera os próprios dados pessoais (nome, cargo, WhatsApp)
-- e os dados básicos da empresa dele (nome, cidade, UF).
-- Status, empresa vinculada, e-mail de login e CNPJ continuam só com o admin.
-- O admin já edita tudo pelas políticas "part: admin edita" e "empresa: admin edita".

create or replace function public.editar_meu_cadastro(p_nome text, p_cargo text, p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Faça login novamente.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o seu nome.'; end if;
  update public.participantes
     set nome = trim(p_nome),
         cargo = nullif(trim(p_cargo), ''),
         whatsapp = nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '')
   where id = auth.uid();
  if not found then raise exception 'Cadastro não encontrado.'; end if;
end $$;

create or replace function public.editar_minha_empresa(p_nome text, p_cidade text, p_uf text)
returns void language plpgsql security definer set search_path = public as $$
declare v_emp uuid;
begin
  if auth.uid() is null then raise exception 'Faça login novamente.'; end if;
  select empresa_id into v_emp from public.participantes where id = auth.uid() and status = 'aprovado';
  if v_emp is null then raise exception 'Seu acesso ainda não foi liberado.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome da empresa.'; end if;
  update public.empresas
     set nome = trim(p_nome),
         cidade = nullif(trim(p_cidade), ''),
         uf = nullif(upper(trim(p_uf)), '')
   where id = v_emp;
end $$;

revoke all on function public.editar_meu_cadastro(text, text, text) from public, anon;
revoke all on function public.editar_minha_empresa(text, text, text) from public, anon;
grant execute on function public.editar_meu_cadastro(text, text, text) to authenticated;
grant execute on function public.editar_minha_empresa(text, text, text) to authenticated;
