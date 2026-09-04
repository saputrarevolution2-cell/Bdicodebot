# PasTele Register & Email

Register sekarang memakai Supabase Auth.

## Agar setelah register langsung masuk Dashboard
Di Supabase Dashboard buka **Authentication → Providers → Email** lalu matikan **Confirm email**.

Dengan Confirm email OFF, `signUp()` mengembalikan session dan PasTele otomatis mengarahkan user ke Dashboard.

## Agar Gmail menerima email dari PasTele
Jika **Confirm email ON**, Supabase akan mengirim email konfirmasi melalui email service yang dikonfigurasi pada project.

Jika yang diinginkan adalah email khusus seperti:
"Akun PasTele berhasil terdaftar dengan username ..."
itu memerlukan email provider/SMTP atau Edge Function. Jangan pernah menaruh SMTP password/API secret di frontend.

UI register sudah menyediakan floating notification setelah register dan pesan yang jelas ketika Confirm email masih aktif.
