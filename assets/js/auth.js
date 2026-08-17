// =====================================================
// TELECOD AUTH SYSTEM
// Supabase Auth
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

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }

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

            delete button.dataset.originalText;
        }

    }
}


// =====================================================
// CHECK SUPABASE
// =====================================================

if (typeof supabase === "undefined") {

    console.error(
        "Supabase belum tersedia. Pastikan CDN Supabase dimuat sebelum auth.js."
    );

}


// =====================================================
// PASSWORD TOGGLE
// =====================================================

document
    .querySelectorAll(".password-toggle")
    .forEach(button => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.target;

            const input =
                document.getElementById(targetId);

            if (!input) return;

            const icon =
                button.querySelector("i");

            if (input.type === "password") {

                input.type = "text";

                if (icon) {
                    icon.className =
                        "fa-solid fa-eye-slash";
                }

            } else {

                input.type = "password";

                if (icon) {
                    icon.className =
                        "fa-solid fa-eye";
                }

            }

        });

    });


// =====================================================
// REGISTER
// =====================================================

const registerForm =
    document.getElementById("registerForm");


registerForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (typeof supabase === "undefined") {
            showMessage(
                "Supabase belum siap. Refresh halaman dan coba lagi."
            );
            return;
        }


        // ---------------------------------------------
        // INPUT
        // ---------------------------------------------

        const name =
            document
                .getElementById("name")
                ?.value
                .trim();

        const username =
            document
                .getElementById("username")
                ?.value
                .trim()
                .toLowerCase();

        const telegramId =
            document
                .getElementById("telegramId")
                ?.value
                .trim();

        const email =
            document
                .getElementById("email")
                ?.value
                .trim()
                .toLowerCase();

        const password =
            document
                .getElementById("password")
                ?.value;

        const confirmPassword =
            document
                .getElementById("confirmPassword")
                ?.value;


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (
            !name ||
            !username ||
            !telegramId ||
            !email ||
            !password ||
            !confirmPassword
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


        if (password !== confirmPassword) {

            showMessage(
                "Konfirmasi password tidak cocok."
            );

            return;
        }


        const button =
            registerForm.querySelector(
                ".auth-submit"
            );

        setLoading(button, true);


        try {

            // -----------------------------------------
            // REGISTER SUPABASE
            // -----------------------------------------

            const {
                data,
                error
            } = await supabase.auth.signUp({

                email,

                password,

                options: {

                    emailRedirectTo:
                        `${window.location.origin}/login.html`,

                    data: {

                        full_name: name,

                        username,

                        telegram_id: telegramId

                    }

                }

            });


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


            console.log(
                "REGISTER SUCCESS:",
                data
            );


            // -----------------------------------------
            // EMAIL CONFIRMATION
            // -----------------------------------------

            if (!data.session) {

                showMessage(
                    "Akun berhasil dibuat!\n\n" +
                    "Kami telah mengirim email konfirmasi.\n\n" +
                    "Silakan buka email kamu lalu klik " +
                    "\"Confirm your email address\".\n\n" +
                    "Setelah selesai, kembali ke halaman Login."
                );

                window.location.href =
                    "login.html";

                return;
            }


            // -----------------------------------------
            // SESSION LANGSUNG ADA
            // -----------------------------------------

            localStorage.setItem(
                "telecod_logged_in",
                "true"
            );

            window.location.href =
                "dashboard.html";

        } catch (error) {

            console.error(
                "REGISTER EXCEPTION:",
                error
            );

            showMessage(
                error?.message ||
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
    document.getElementById("loginForm");


loginForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (typeof supabase === "undefined") {

            showMessage(
                "Supabase belum siap. Refresh halaman dan coba lagi."
            );

            return;
        }


        const emailInput =
            document.getElementById("email");

        const passwordInput =
            document.getElementById("password");


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

            // -----------------------------------------
            // LOGIN
            // -----------------------------------------

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({

                email,

                password

            });


            // -----------------------------------------
            // ERROR
            // -----------------------------------------

            if (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                const errorMessage =
                    error.message?.toLowerCase() || "";


                if (
                    errorMessage.includes(
                        "email not confirmed"
                    )
                ) {

                    showMessage(
                        "Email kamu belum dikonfirmasi.\n\n" +
                        "Silakan buka email dari Supabase " +
                        "dan klik \"Confirm your email address\"."
                    );

                    return;
                }


                if (
                    errorMessage.includes(
                        "invalid login credentials"
                    )
                ) {

                    showMessage(
                        "Email atau password salah."
                    );

                    return;
                }


                showMessage(
                    error.message ||
                    "Login gagal."
                );

                return;
            }


            // -----------------------------------------
            // CHECK SESSION
            // -----------------------------------------

            if (!data?.session) {

                showMessage(
                    "Login berhasil tetapi session tidak ditemukan."
                );

                return;
            }


            console.log(
                "LOGIN SUCCESS:",
                data.user
            );


            // -----------------------------------------
            // SAVE STATUS
            // -----------------------------------------

            localStorage.setItem(
                "telecod_logged_in",
                "true"
            );


            // -----------------------------------------
            // VERIFY SESSION
            // -----------------------------------------

            const {
                data: sessionData,
                error: sessionError
            } = await supabase.auth.getSession();


            if (
                sessionError ||
                !sessionData?.session
            ) {

                console.error(
                    "SESSION ERROR:",
                    sessionError
                );

                showMessage(
                    "Session belum berhasil disimpan."
                );

                return;
            }


            // -----------------------------------------
            // REDIRECT
            // -----------------------------------------

            window.location.replace(
                "dashboard.html"
            );

        } catch (error) {

            console.error(
                "LOGIN EXCEPTION:",
                error
            );

            showMessage(
                error?.message ||
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
            async event => {

                event.preventDefault();


                if (typeof supabase === "undefined") {

                    showMessage(
                        "Supabase belum siap."
                    );

                    return;
                }


                setLoading(
                    button,
                    true
                );


                try {

                    const {
                        error
                    } =
                        await supabase.auth.signInWithOAuth({

                            provider: "google",

                            options: {

                                redirectTo:
                                    `${window.location.origin}/dashboard.html`

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

                        setLoading(
                            button,
                            false
                        );

                    }

                } catch (error) {

                    console.error(
                        "GOOGLE EXCEPTION:",
                        error
                    );

                    showMessage(
                        error?.message ||
                        "Google Login gagal."
                    );

                    setLoading(
                        button,
                        false
                    );

                }

            }
        );

    });


// =====================================================
// CHECK AUTH
// =====================================================

async function checkAuth() {

    if (typeof supabase === "undefined") {
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {

            console.error(
                "CHECK AUTH ERROR:",
                error
            );

            return null;
        }


        return data?.session || null;

    } catch (error) {

        console.error(
            "CHECK AUTH EXCEPTION:",
            error
        );

        return null;
    }

}


// =====================================================
// LOGOUT
// =====================================================

document
    .querySelectorAll("[data-logout]")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                if (
                    typeof supabase ===
                    "undefined"
                ) {
                    return;
                }


                try {

                    const {
                        error
                    } =
                        await supabase.auth.signOut();


                    if (error) {

                        console.error(
                            "LOGOUT ERROR:",
                            error
                        );

                        showMessage(
                            error.message
                        );

                        return;
                    }


                    localStorage.removeItem(
                        "telecod_logged_in"
                    );


                    window.location.replace(
                        "index.html"
                    );

                } catch (error) {

                    console.error(
                        "LOGOUT EXCEPTION:",
                        error
                    );

                    showMessage(
                        "Gagal keluar dari akun."
                    );

                }

            }
        );

    });
