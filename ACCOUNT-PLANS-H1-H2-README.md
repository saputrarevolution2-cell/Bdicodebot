# TeleCod — Account Plans + H1/H2 Balance

## Supabase
Run `supabase/ACCOUNT-PLANS-H1-H2.sql` in Supabase SQL Editor after the existing TeleCod schema.

Plans:
- Langganan 1 hari: Rp15.000
- Langganan 3 hari: Rp30.000
- Langganan 7 hari: Rp50.000
- Premium lifetime: Rp250.000

Langganan grants up to 5 paid-code opens per WIB calendar day.
Premium grants all paid Code/Link/Channel/Group access.

## H1/H2
- 05:00–20:59 WIB: sale is H1, available next calendar day.
- 21:00–04:59 WIB: sale is H2, available two calendar days later.
Pending funds are not included in `available_balance`, so withdrawals cannot spend them.

The wallet page calls the release RPC when opened and the Pending card shows each maturity time.
Cashi checkout uses the existing `create-cashi-payment` Edge Function. The Cashi webhook must complete the order through `admin_mark_order_paid`, which now activates plans or schedules seller funds automatically.
