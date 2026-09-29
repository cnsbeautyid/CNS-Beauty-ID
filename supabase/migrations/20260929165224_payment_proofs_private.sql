-- Phase 7: manual bank-transfer payments.
--
-- 1. The payment-proofs bucket was public with no size/type limits. Proofs can
--    contain names and bank account numbers, so the bucket becomes private.
--    Customers may upload only into {their uid}/{their pending order id}/ and
--    read only their own folder; staff (admin/owner) can read everything.
--    Files are never updated or deleted by customers (no UPDATE/DELETE policy).
-- 2. settings.payment holds the public transfer instructions. It starts empty:
--    the owner fills in the bank accounts in the dashboard. The storefront
--    never invents account details.
-- No existing function, table or order data is changed.

update storage.buckets
   set public = false,
       file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'payment-proofs';

create policy "payment proofs own upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
        from public.orders o
       where o.id::text = (storage.foldername(name))[2]
         and o.user_id = (select auth.uid())
         and o.status = 'pending_payment'
    )
  );

create policy "payment proofs own read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "payment proofs staff read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (select private.has_any_role(array['admin'::public.app_role]))
  );

insert into public.settings (key, value, is_public, description)
values (
  'payment',
  jsonb_build_object('expiry_hours', 24, 'bank_accounts', jsonb_build_array(), 'note', null),
  true,
  'Manual transfer instructions shown at checkout. bank_accounts: [{bank, account_number, account_name}]'
)
on conflict (key) do nothing;
