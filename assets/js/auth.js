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

                icon.className =
                    "fa-solid fa-eye-slash";

            } else {

                input.type = "password";

                icon.className =
                    "fa-solid fa-eye";

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

        const name =
            document.getElementById("name")?.value.trim();

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
            document.getElementById("password")?.value;

        const confirmPassword =
            document
                .getElementById("confirmPassword")
                ?.value;


        // VALIDATION

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

            const {
                data,
                error
            } = await supabase.auth.signUp({

                email,

                password,

                options: {

                    emailRedirectTo:
                        "https://telecod.biz.id/login.html",

                    data: {

                        full_name: name,

                        username,

                        telegram_id:
                            telegramId

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


            // EMAIL CONFIRMATION AKTIF

            if (!data.session) {

                showMessage(
                    "Akun berhasil dibuat!\n\n" +
                    "Silakan cek email kamu dan klik " +
                    "\"Confirm your email address\".\n\n" +
                    "Setelah dikonfirmasi, silakan login."
                );

                window.location.href =
                    "login.html";

                return;
            }


            // CONFIRMATION DIMATIKAN

            window.location.href =
                "dashboard.html";


        } catch (error) {

            console.error(
                "REGISTER EXCEPTION:",
                error
            );

            showMessage(
                "Terjadi kesalahan saat membuat akun."
            );

        } finally {

            setLoading(button, false);

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

const loginForm=document.getElementById("loginForm");

loginForm?.addEventListener("submit",async e=>{
    e.preventDefault();

    const email=document.getElementById("email")?.value.trim().toLowerCase();
    const password=document.getElementById("password")?.value;

    if(!email||!password){
        showMessage("Email dan password wajib diisi.");
        return;
    }

    const button=loginForm.querySelector(".auth-submit");
    setLoading(button,true);

    try{
        console.log("Supabase:",supabase);

        if(!supabase||!supabase.auth){
            throw new Error("Supabase Auth tidak tersedia.");
        }

        const result=await supabase.auth.signInWithPassword({
            email:email,
            password:password
        });

        console.log("LOGIN RESULT:",result);

        const {data,error}=result;

        if(error){
            console.error("SUPABASE AUTH ERROR:",error);

            showMessage(
                "Login gagal:\n\n"+error.message
            );
            return;
        }

        if(!data?.session){
            showMessage(
                "Login gagal: session tidak ditemukan."
            );
            return;
        }

        localStorage.setItem(
            "telecod_logged_in",
            "true"
        );

        console.log(
            "LOGIN BERHASIL:",
            data.user
        );

        window.location.href="dashboard.html";

    }catch(error){

        console.error(
            "LOGIN EXCEPTION:",
            error
        );

        showMessage(
            "Supabase Auth Error:\n\n"+
            (error?.message||String(error))
        );

    }finally{

        setLoading(button,false);

    }
});


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
                        "GOOGLE EXCEPTION:",
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
// LOGOUT
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

                    window.location.replace(
                        "index.html"
                    );

                }

            }
        );

    });
