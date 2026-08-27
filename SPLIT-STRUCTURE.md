# TeleCod Split Structure

Every user-facing page is now an independent HTML entry point. Dashboard navigation/footer are mounted from `js/components.js`; page-specific content remains in `js/dashboard.js` until further componentization. Authentication pages are separate under `auth/` and use isolated `js/auth.js` + `css/auth.css`.
