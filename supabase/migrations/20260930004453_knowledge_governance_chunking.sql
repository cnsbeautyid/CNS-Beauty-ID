-- Phase 10: governed, searchable RAG knowledge.
--
-- 1. Review guard on knowledge_documents (mirrors the claim guard, Phase 5):
--    - approving stamps approved_by / approved_at;
--    - editing the title/body of an approved document resets it to
--      pending_review, so changed text is never silently approved;
--    - automation using the service key (current_user = service_role) cannot
--      approve: its approvals become pending_review. A person approves, as an
--      app admin (auth.uid()) or the owner in the dashboard.
-- 2. Chunking: approved documents are split into ~800-character paragraph
--    chunks (title prepended) whenever title/body/status change; documents
--    that stop being approved lose their chunks. Embeddings stay NULL for now
--    (owner decision: lexical search first; match_knowledge already supports it).
-- 3. Data: the two seeded documents with unverified claims ("Tentang CNS
--    Beauty" and the product document: "aman untuk ibu hamil", "anti-aging",
--    "semua jenis kulit", "Skin Regeneration") go back to pending_review
--    (owner decision). "Pengiriman" and "Batasan CNS Beauty AI" stay approved
--    and get chunks.

create or replace function private.knowledge_review_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'approved' and new.status = 'approved'
     and (new.title is distinct from old.title or new.body is distinct from old.body) then
    new.status := 'pending_review';
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    if current_user = 'service_role' then
      new.status := 'pending_review';
    else
      new.approved_by := (select auth.uid());
      new.approved_at := now();
    end if;
  end if;

  if new.status <> 'approved' then
    new.approved_by := null;
    new.approved_at := null;
  end if;
  return new;
end;
$$;

create trigger knowledge_documents_review_guard
  before insert or update on public.knowledge_documents
  for each row execute function private.knowledge_review_guard();

-- Paragraph-aware chunking. Paragraphs are packed up to p_max characters;
-- longer paragraphs are split at word boundaries.
create or replace function private.chunk_text(p_text text, p_max integer default 800)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  paragraph text;
  piece text;
  pending text := '';
  chunks text[] := '{}';
begin
  foreach paragraph in array regexp_split_to_array(trim(coalesce(p_text, '')), E'\\n\\s*\\n')
  loop
    paragraph := trim(paragraph);
    continue when paragraph = '';

    while length(paragraph) > p_max loop
      piece := substring(paragraph from 1 for p_max);
      piece := coalesce(nullif(regexp_replace(piece, '\s+\S*$', ''), ''), piece);
      if pending <> '' then
        chunks := chunks || pending;
        pending := '';
      end if;
      chunks := chunks || trim(piece);
      paragraph := trim(substring(paragraph from length(piece) + 1));
    end loop;
    continue when paragraph = '';

    if pending = '' then
      pending := paragraph;
    elsif length(pending) + 2 + length(paragraph) <= p_max then
      pending := pending || E'\n\n' || paragraph;
    else
      chunks := chunks || pending;
      pending := paragraph;
    end if;
  end loop;

  if pending <> '' then
    chunks := chunks || pending;
  end if;
  return chunks;
end;
$$;

-- Rebuilds one document's chunks. SECURITY DEFINER because knowledge_chunks
-- has no write policy; private schema, EXECUTE revoked from API roles.
create or replace function private.rebuild_knowledge_chunks(p_document_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.knowledge_documents;
  chunk text;
  next_index integer := 0;
begin
  select * into doc from public.knowledge_documents where id = p_document_id;
  if not found then
    return 0;
  end if;

  delete from public.knowledge_chunks where document_id = p_document_id;
  if doc.status <> 'approved' then
    return 0;
  end if;

  foreach chunk in array private.chunk_text(doc.body)
  loop
    insert into public.knowledge_chunks (document_id, chunk_index, content, token_estimate)
    values (p_document_id, next_index, doc.title || E'\n\n' || chunk, ceil(length(doc.title || chunk) / 4.0)::integer);
    next_index := next_index + 1;
  end loop;
  return next_index;
end;
$$;

create or replace function private.knowledge_chunks_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.title is distinct from old.title
     or new.body is distinct from old.body then
    perform private.rebuild_knowledge_chunks(new.id);
  end if;
  return null;
end;
$$;

revoke execute on function private.chunk_text(text, integer) from public, anon, authenticated;
revoke execute on function private.rebuild_knowledge_chunks(uuid) from public, anon, authenticated;
revoke execute on function private.knowledge_chunks_sync() from public, anon, authenticated;
revoke execute on function private.knowledge_review_guard() from public, anon, authenticated;

create trigger knowledge_documents_chunk_sync
  after insert or update of title, body, status on public.knowledge_documents
  for each row execute function private.knowledge_chunks_sync();

update public.knowledge_documents
   set status = 'pending_review'
 where status = 'approved'
   and (title = 'Tentang CNS Beauty' or category = 'product');

select private.rebuild_knowledge_chunks(id) from public.knowledge_documents where status = 'approved';
