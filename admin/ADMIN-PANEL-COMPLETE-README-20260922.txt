PasTele Admin Panel Complete Management Fix — 22 Sep 2026

UI
- Explicit Font Awesome 6.7.2 is loaded on every admin page.
- Unified responsive CSS is loaded after page CSS.
- Mobile sidebar becomes horizontal scroll navigation instead of unstyled text.
- Tables, actions, cards, filters and forms are consistent.

USERS
- Username/email/balance visible.
- Ban/unban, admin role, balance adjustment, delete user.
- New Ganti Password action. Password minimum 8 characters.
- Admin/owner account password is protected.

PRODUCTS / CONTENT
- admin_content includes Product, PasteLink, Code, Channel, Group, Paste.
- Owner username is displayed.
- Actual content body is returned for admin view/edit.
- Edit title, price, description, status, slug, content.
- Delete content.

CONTENT EMPTY BUG
- The previous content.js treated select value "all" as a real filter, causing all rows to be filtered out.
- This package treats "all" as no filter.

ORDERS
- Username/email visible.
- Search by Order ID, username or email.
- Success / Failed / Delete actions.

PAYMENTS
- All user balances are displayed.
- Balance adjustment action with reason.
- Payment history with username.

WITHDRAWALS
- Username/email visible.
- Manual and instant mode are displayed from the withdrawal data.
- Approve / Complete / Rejected.
- Rejected requires a reason and sends it as p_note to the existing server processor.

TRANSACTIONS
- Username/email visible.
- Search.
- Delete action.

SQL
Run:
  admin/PASTELE_ADMIN_PANEL_COMPLETE_MANAGEMENT_SQL_20260922.sql

This patch is intended to run after the existing canonical/unified PasTele SQL.
