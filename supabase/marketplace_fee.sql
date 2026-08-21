-- TeleCod marketplace fee migration
-- Default marketplace fee: 20%.
-- Example: Rp10.000 -> fee Rp2.000 -> seller receives Rp8.000.

alter table if exists public.sell_orders
  add column if not exists fee_percent numeric(5,2) not null default 20,
  add column if not exists fee_amount bigint not null default 0,
  add column if not exists seller_receive bigint not null default 0;

-- Recalculate existing rows safely where possible.
update public.sell_orders
set fee_percent = coalesce(fee_percent, 20),
    fee_amount = floor(price * coalesce(fee_percent,20) / 100),
    seller_receive = price - floor(price * coalesce(fee_percent,20) / 100)
where price is not null;

-- Prevent impossible negative amounts.
alter table if exists public.sell_orders
  drop constraint if exists sell_orders_fee_amount_nonnegative;
alter table if exists public.sell_orders
  add constraint sell_orders_fee_amount_nonnegative check (fee_amount >= 0);

alter table if exists public.sell_orders
  drop constraint if exists sell_orders_seller_receive_nonnegative;
alter table if exists public.sell_orders
  add constraint sell_orders_seller_receive_nonnegative check (seller_receive >= 0);
