-- Fix: quote_cart() raised "record v_variant is not assigned yet" for every
-- in-stock product WITHOUT a variant (i.e. every current product), because
-- the lines builder read v_variant.* after `v_variant := null`, which leaves
-- a PL/pgSQL record unassigned. place_order() calls quote_cart(), so
-- ordering failed the same way. It went unnoticed only because stock was 0.
--
-- Change: keep the variant fields in scalar variables. Logic, signature,
-- return shape and grants (postgres, service_role) are unchanged;
-- CREATE OR REPLACE keeps existing privileges.

create or replace function public.quote_cart(
  p_items jsonb,
  p_user_id uuid default null::uuid,
  p_email text default null::text,
  p_coupon_code text default null::text,
  p_points integer default 0
)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_item jsonb;
  v_product record;
  v_variant record;
  -- Scalars instead of v_variant.* so a product without a variant never
  -- touches the unassigned record.
  v_variant_id uuid;
  v_variant_name text;
  v_variant_sku text;
  v_lines jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_discount bigint := 0;
  v_shipping bigint := 0;
  v_points_discount bigint := 0;
  v_points_applied int := 0;
  v_qty int;
  v_price bigint;
  v_stock int;
  v_coupon public.coupons;
  v_coupon_json jsonb := null;
  v_ship_cfg jsonb;
  v_loyalty_cfg jsonb;
  v_free_threshold bigint;
  v_flat_rate bigint;
  v_point_value bigint;
  v_max_redeem_pct int;
  v_balance int := 0;
  v_user_uses int;
  v_free_shipping boolean := false;
  v_partner public.partner_accounts;
  v_wholesale public.wholesale_prices;
  v_is_partner boolean := false;
begin
  if p_user_id is not null then
    select * into v_partner from public.partner_accounts pa
     where pa.user_id = p_user_id and pa.is_active;
    v_is_partner := found;
  end if;

  select value into v_ship_cfg from public.settings where key = 'shipping';
  select value into v_loyalty_cfg from public.settings where key = 'loyalty';
  v_free_threshold := coalesce((v_ship_cfg ->> 'free_threshold')::bigint, 0);
  v_flat_rate := coalesce((v_ship_cfg ->> 'flat_rate')::bigint, 0);
  v_point_value := coalesce((v_loyalty_cfg ->> 'point_value')::bigint, 0);
  v_max_redeem_pct := coalesce((v_loyalty_cfg ->> 'max_redeem_percent')::int, 0);

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := greatest(1, least(99, coalesce((v_item ->> 'quantity')::int, 1)));

    select p.id, p.name, p.sku, p.price, p.stock, p.status, p.thumbnail_url, p.slug
      into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid;

    if not found or v_product.status <> 'active' then
      v_errors := v_errors || jsonb_build_object(
        'code', 'product_unavailable', 'product_id', v_item ->> 'product_id');
      continue;
    end if;

    v_price := v_product.price;
    v_stock := v_product.stock;
    v_variant_id := null;
    v_variant_name := null;
    v_variant_sku := null;

    if v_item ? 'variant_id' and nullif(v_item ->> 'variant_id', '') is not null then
      select pv.id, pv.name, pv.sku, pv.price, pv.stock
        into v_variant
        from public.product_variants pv
       where pv.id = (v_item ->> 'variant_id')::uuid
         and pv.product_id = v_product.id;
      if not found then
        v_errors := v_errors || jsonb_build_object(
          'code', 'variant_unavailable', 'product_id', v_product.id);
        continue;
      end if;
      v_variant_id := v_variant.id;
      v_variant_name := v_variant.name;
      v_variant_sku := v_variant.sku;
      v_price := v_variant.price;
      v_stock := v_variant.stock;
    end if;

    -- Approved partners buy at their wholesale price, subject to minimum quantity.
    if v_is_partner then
      select * into v_wholesale from public.wholesale_prices wp
       where wp.product_id = v_product.id
         and wp.member_type = v_partner.member_type
         and wp.level = v_partner.tier_level;
      if not found then
        v_errors := v_errors || jsonb_build_object(
          'code', 'wholesale_price_missing', 'product_id', v_product.id);
        continue;
      end if;
      if v_qty < v_wholesale.min_qty then
        v_errors := v_errors || jsonb_build_object(
          'code', 'min_qty', 'product_id', v_product.id, 'min_qty', v_wholesale.min_qty);
        continue;
      end if;
      v_price := v_wholesale.unit_price;
    end if;

    if v_stock < v_qty then
      v_errors := v_errors || jsonb_build_object(
        'code', case when v_stock = 0 then 'out_of_stock' else 'insufficient_stock' end,
        'product_id', v_product.id, 'available', v_stock);
      continue;
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant_id,
      'slug', v_product.slug,
      'name', v_product.name,
      'variant_name', v_variant_name,
      'sku', coalesce(v_variant_sku, v_product.sku),
      'unit_price', v_price,
      'quantity', v_qty,
      'line_total', v_price * v_qty,
      'image_url', v_product.thumbnail_url,
      'stock', v_stock
    );
  end loop;

  -- Coupons and points are retail benefits; partners already get wholesale pricing.
  if v_is_partner and (nullif(trim(p_coupon_code), '') is not null or coalesce(p_points, 0) > 0) then
    v_errors := v_errors || jsonb_build_object('code', 'not_available_for_partners');
    p_coupon_code := null;
    p_points := 0;
  end if;

  -- Coupon
  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons c where c.code = upper(trim(p_coupon_code));

    if not found or not v_coupon.is_active then
      v_errors := v_errors || jsonb_build_object('code', 'coupon_invalid');
    elsif v_coupon.expires_at is not null and v_coupon.expires_at < now() then
      v_errors := v_errors || jsonb_build_object('code', 'coupon_expired');
    elsif v_coupon.starts_at is not null and v_coupon.starts_at > now() then
      v_errors := v_errors || jsonb_build_object('code', 'coupon_not_started');
    elsif v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
      v_errors := v_errors || jsonb_build_object('code', 'coupon_exhausted');
    elsif v_subtotal < v_coupon.min_subtotal then
      v_errors := v_errors || jsonb_build_object('code', 'coupon_min_subtotal', 'min_subtotal', v_coupon.min_subtotal);
    else
      if v_coupon.usage_limit_per_user is not null then
        select count(*) into v_user_uses
          from public.coupon_redemptions cr
         where cr.coupon_id = v_coupon.id
           and ((p_user_id is not null and cr.user_id = p_user_id)
                or (p_email is not null and lower(cr.email) = lower(p_email)));
      else
        v_user_uses := 0;
      end if;

      if v_coupon.usage_limit_per_user is not null and v_user_uses >= v_coupon.usage_limit_per_user then
        v_errors := v_errors || jsonb_build_object('code', 'coupon_already_used');
      else
        if v_coupon.discount_type = 'percent' then
          v_discount := (v_subtotal * v_coupon.discount_value) / 100;
        elsif v_coupon.discount_type = 'fixed' then
          v_discount := v_coupon.discount_value;
        elsif v_coupon.discount_type = 'free_shipping' then
          v_free_shipping := true;
        end if;
        if v_coupon.max_discount is not null then
          v_discount := least(v_discount, v_coupon.max_discount);
        end if;
        v_discount := least(v_discount, v_subtotal);
        v_coupon_json := jsonb_build_object(
          'id', v_coupon.id, 'code', v_coupon.code, 'type', v_coupon.discount_type,
          'description', v_coupon.description);
      end if;
    end if;
  end if;

  -- Loyalty points
  if p_user_id is not null and coalesce(p_points, 0) > 0 and v_point_value > 0 then
    select coalesce(la.balance, 0) into v_balance
      from public.loyalty_accounts la where la.user_id = p_user_id;
    v_balance := coalesce(v_balance, 0);
    v_points_applied := least(p_points, v_balance);
    v_points_applied := least(
      v_points_applied,
      (((v_subtotal - v_discount) * v_max_redeem_pct / 100) / v_point_value)::int
    );
    v_points_applied := greatest(v_points_applied, 0);
    v_points_discount := v_points_applied * v_point_value;
    if p_points > v_balance then
      v_errors := v_errors || jsonb_build_object('code', 'points_insufficient', 'balance', v_balance);
    end if;
  end if;

  if v_subtotal = 0 or v_free_shipping or (v_free_threshold > 0 and v_subtotal >= v_free_threshold) then
    v_shipping := 0;
  else
    v_shipping := v_flat_rate;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount_total', v_discount,
    'points_applied', v_points_applied,
    'points_discount', v_points_discount,
    'shipping_total', v_shipping,
    'total', greatest(0, v_subtotal - v_discount - v_points_discount + v_shipping),
    'coupon', v_coupon_json,
    'free_shipping_threshold', v_free_threshold,
    'pricing', case when v_is_partner then v_partner.member_type::text else 'retail' end,
    'partner_tier_level', case when v_is_partner then v_partner.tier_level else null end,
    'errors', v_errors
  );
end;
$function$;
