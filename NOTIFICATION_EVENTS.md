# PasTele Notification Events

The canonical event names are:

- `purchase` — buyer's successful purchase
- `sale` — creator's content was purchased
- `publish` — creator successfully published content
- `withdraw` — user's withdrawal request/status changed
- `like`, `comment`, `follow` — social events

The database functions are:
- `pastele_notify_purchase`
- `pastele_notify_publish`
- `pastele_notify_withdraw`

The existing core payment/view/like RPCs are not replaced by this patch.
The payment webhook/success handler should call `pastele_notify_purchase` only
after payment is verified as successful, not merely when an order is created.
The create-content RPC should call `pastele_notify_publish` only after the
content is actually published.
The withdrawal request/status RPC should call `pastele_notify_withdraw` after
the withdrawal row is successfully created or its status changes.
