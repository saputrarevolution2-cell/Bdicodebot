# PasTele Full Fix Contract

- Existing core purchase, view and like RPCs remain canonical.
- Paid price is Rp2,000–Rp100,000 in Rp1,000 increments.
- Marketplace metadata is public for code, PasteLink and group/channel.
- Paid creation requires login; free creation follows existing policy.
- Existing created content/link payloads are not rewritten by this package.
- Login purchase entitlement is permanent per purchased item; guest purchase is
  guest-token based.
- Premium/subscription access rules remain enforced by the canonical core access
  RPC.
- Creator revenue: 70%; platform: 30%; settlement H+2.
- Global notification toast is injected on every HTML page.
- Platform and user social links are stored separately.
- Group chat tables/RPCs are included.
- Admin password-reset support is represented through platform settings; an
  admin should use the existing secure auth/admin flow rather than storing a
  user's plaintext password.
