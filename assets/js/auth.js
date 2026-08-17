// =====================================================
// TELECOD AUTH SYSTEM
// =====================================================


// =====================================================
// HELPERS
// =====================================================

function showMessage(message) {

    alert(message);

}


function setLoading(button, loading) {

    if (!button) return;

    if (loading) {

        button.dataset.originalText =
            button.innerHTML;

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Memproses...</span>
        `;

    } else {

        button.disabled = false;

        if (button.dataset.originalText) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


// =====================================================
// PASSWORD TOGGLE
// =====================================================

document
    .querySelectorAll(".password-toggle")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.target;

                const input =
                    document.getElementById(
                        targetId
                    );

                if (!input) return;

                const icon =
                    button.querySelector("i");

                if (
                    input.type === "password"
                ) {

                    input.type = "text";

                    icon.className =
                        "fa-solid fa-eye-slash";

                } else {

                    input.type = "password";

                    icon.className =
                        "fa-solid fa-eye";

                }

            }
        );

    });


// =====================================================
// REGISTER
// =====================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );


registerForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        // ---------------------------------------------
        // GET INPUT
        // ---------------------------------------------

        const name =
            document
                .getElementById("name")
                .value
                .trim();

        const username =
            document
                .getElementById("username")
                .value
                .trim()
                .toLowerCase();

        const telegramId =
            document
                .getElementById("telegramId")
                .value
                .trim();

        const email =
            document
                .getElementById("email")
                .value
                .trim()
                .toLowerCase();

        const password =
            document
                .getElementById("password")
                .value;

        const confirmPassword =
            document
                .getElementById(
                    "confirmPassword"
                )
                .value;


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (
            !name ||
            !username ||
            !telegramId ||
            !email ||
            !password
        ) {

            showMessage(
                "Semua field wajib diisi."
            );

            return;
        }


        if (username.length < 3) {

            showMessage(
                "Username minimal 3 karakter."
            );

            return;
        }


        if (password.length < 8) {

            showMessage(
                "Password minimal 8 karakter."
            );

            return;
        }


        if (
            password !== confirmPassword
        ) {

            showMessage(
                "Konfirmasi password tidak cocok."
            );

            return;
        }


        // ---------------------------------------------
        // BUTTON
        // ---------------------------------------------

        const button =
            registerForm.querySelector(
                ".auth-submit"
            );

        setLoading(button, true);


        try {

            // -----------------------------------------
            // SUPABASE REGISTER
            // -----------------------------------------

            const {
                data,
                error
            } = await supabase.auth.signUp({

                email: email,

                password: password,

                options: {

                    emailRedirectTo:
                        "https://telecod.biz.id/login.html",

                    data: {

                        full_name: name,

                        username:
                            username,

                        telegram_id:
                            telegramId

                    }

                }

            });


            // -----------------------------------------
            // ERROR
            // -----------------------------------------

            if (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                showMessage(
                    error.message
                );

                return;
            }


            // -----------------------------------------
            // REGISTER SUCCESS
            // -----------------------------------------

            console.log(
                "REGISTER SUCCESS:",
                data
            );


            /*
             * Jika Email Confirmation aktif,
             * session biasanya NULL.
             */

            if (!data.session) {

                showMessage(
                    "Akun berhasil dibuat!\n\n" +
                    "Silakan buka email kamu dan klik " +
                    "\"Confirm your email address\".\n\n" +
                    "Setelah email berhasil dikonfirmasi, " +
                    "kembali ke halaman Login."
                );

                window.location.href =
                    "login.html";

                return;
            }


            // -----------------------------------------
            // JIKA CONFIRM EMAIL DIMATIKAN
            // -----------------------------------------

            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "REGISTER EXCEPTION:",
                error
            );

            showMessage(
                "Terjadi kesalahan saat membuat akun."
            );

        } finally {

            setLoading(
                button,
                false
            );

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );


loginForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const emailInput =
            document.getElementById(
                "email"
            );

        const passwordInput =
            document.getElementById(
                "password"
            );


        if (!emailInput || !passwordInput) {
            return;
        }


        const email =
            emailInput.value
                .trim()
                .toLowerCase();

        const password =
            passwordInput.value;


        if (!email || !password) {

            showMessage(
                "Email dan password wajib diisi."
            );

            return;
        }


        const button =
            loginForm.querySelector(
                ".auth-submit"
            );

        setLoading(button, true);


        try {

            const {
                data,
                error
            } = await supabase.auth
                .signInWithPassword({

                    email: email,

                    password: password

                });


            if (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                // -------------------------------------
                // EMAIL BELUM CONFIRM
                // -------------------------------------

                if (
                    error.message
                        .toLowerCase()
                        .includes(
                            "email not confirmed"
                        )
                ) {

                    showMessage(
                        "Email kamu belum dikonfirmasi.\n\n" +
                        "Silakan cek inbox email dan klik " +
                        "\"Confirm your email address\"."
                    );

                    return;
                }


                showMessage(
                    error.message
                );

                return;
            }


            if (!data.session) {

                showMessage(
                    "Login gagal. Session tidak ditemukan."
                );

                return;
            }


            console.log(
                "LOGIN SUCCESS:",
                data.user
            );


            // -----------------------------------------
            // SESSION TERSIMPAN OTOMATIS
            // -----------------------------------------

            localStorage.setItem(
                "telecod_logged_in",
                "true"
            );


            // -----------------------------------------
            // REDIRECT
            // -----------------------------------------

            window.location.href =
                "dashboard.html";


        } catch (error) {

            console.error(
                "LOGIN EXCEPTION:",
                error
            );

            showMessage(
                "Terjadi kesalahan saat login."
            );

        } finally {

            setLoading(
                button,
                false
            );

        }

    }
);


// =====================================================
// GOOGLE LOGIN
// =====================================================

document
    .querySelectorAll(".social-login")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                try {

                    const {
                        error
                    } =
                        await supabase.auth
                            .signInWithOAuth({

                                provider:
                                    "google",

                                options: {

                                    redirectTo:
                                        "https://telecod.biz.id/dashboard.html"

                                }

                            });


                    if (error) {

                        console.error(
                            "GOOGLE ERROR:",
                            error
                        );

                        showMessage(
                            error.message
                        );

                    }

                } catch (error) {

                    console.error(
                        error
                    );

                    showMessage(
                        "Google Login gagal."
                    );

                }

            }
        );

    });


// =====================================================
// CHECK EMAIL CONFIRMATION
// =====================================================

async function checkAuth() {

    const session =
        await getCurrentSession();

    if (!session) {
        return null;
    }

    return session;

}


// =====================================================
// LOGOUT BUTTON
// =====================================================

document
    .querySelectorAll("[data-logout]")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const success =
                    await logoutUser();

                if (success) {

                    localStorage.removeItem(
                        "telecod_logged_in"
                    );

                    window.location.href =
                        "index.html";

                }

            }
        );

    });
