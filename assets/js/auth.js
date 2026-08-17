const supabase=window.telecodSupabase;

// =====================================================
// TELECOD AUTH SYSTEM
// =====================================================

function showMessage(message){
    alert(message);
}

function setLoading(button,loading){
    if(!button)return;
    if(loading){
        button.dataset.originalText=button.innerHTML;
        button.disabled=true;
        button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><span>Memproses...</span>';
    }else{
        button.disabled=false;
        if(button.dataset.originalText){
            button.innerHTML=button.dataset.originalText;
        }
    }
}

// =====================================================
// PASSWORD TOGGLE
// =====================================================

document.querySelectorAll(".password-toggle").forEach(button=>{
    button.addEventListener("click",()=>{
        const target=document.getElementById(button.dataset.target);
        if(!target)return;

        const icon=button.querySelector("i");

        if(target.type==="password"){
            target.type="text";
            if(icon)icon.className="fa-solid fa-eye-slash";
        }else{
            target.type="password";
            if(icon)icon.className="fa-solid fa-eye";
        }
    });
});

// =====================================================
// CHECK SUPABASE
// =====================================================

function checkSupabase(){
    if(typeof supabase==="undefined"){
        showMessage("Supabase belum terhubung.\n\nPastikan database.js dimuat sebelum auth.js.");
        return false;
    }

    if(!supabase.auth){
        showMessage("Supabase Auth tidak tersedia.");
        return false;
    }

    return true;
}

// =====================================================
// REGISTER
// =====================================================

const registerForm=document.getElementById("registerForm");

registerForm?.addEventListener("submit",async e=>{
    e.preventDefault();

    if(!checkSupabase())return;

    const name=document.getElementById("name")?.value.trim();
    const username=document.getElementById("username")?.value.trim().toLowerCase();
    const telegramId=document.getElementById("telegramId")?.value.trim();
    const email=document.getElementById("email")?.value.trim().toLowerCase();
    const password=document.getElementById("password")?.value;
    const confirmPassword=document.getElementById("confirmPassword")?.value;

    if(!name||!username||!telegramId||!email||!password||!confirmPassword){
        showMessage("Semua field wajib diisi.");
        return;
    }

    if(username.length<3){
        showMessage("Username minimal 3 karakter.");
        return;
    }

    if(password.length<8){
        showMessage("Password minimal 8 karakter.");
        return;
    }

    if(password!==confirmPassword){
        showMessage("Konfirmasi password tidak cocok.");
        return;
    }

    const button=registerForm.querySelector(".auth-submit");
    setLoading(button,true);

    try{
        const {data,error}=await supabase.auth.signUp({
            email:email,
            password:password,
            options:{
                emailRedirectTo:"https://telecod.biz.id/login.html",
                data:{
                    full_name:name,
                    username:username,
                    telegram_id:telegramId
                }
            }
        });

        console.log("REGISTER:",data);

        if(error){
            console.error("REGISTER ERROR:",error);
            showMessage(error.message);
            return;
        }

        if(!data.session){
            showMessage(
                "Akun berhasil dibuat!\n\n"+
                "Silakan cek email kamu dan klik Confirm your email address.\n\n"+
                "Setelah email dikonfirmasi, silakan login."
            );

            window.location.replace("login.html");
            return;
        }

        window.location.replace("dashboard.html");

    }catch(error){
        console.error("REGISTER EXCEPTION:",error);
        showMessage("Register gagal:\n\n"+(error.message||error));
    }finally{
        setLoading(button,false);
    }
});

// =====================================================
// LOGIN
// =====================================================

const loginForm=document.getElementById("loginForm");

loginForm?.addEventListener("submit",async e=>{
    e.preventDefault();

    if(!checkSupabase())return;

    const email=document.getElementById("email")?.value.trim().toLowerCase();
    const password=document.getElementById("password")?.value;

    if(!email||!password){
        showMessage("Email dan password wajib diisi.");
        return;
    }

    const button=loginForm.querySelector(".auth-submit");
    setLoading(button,true);

    try{
        console.log("LOGIN SUPABASE:",supabase);

        const {data,error}=await supabase.auth.signInWithPassword({
            email:email,
            password:password
        });

        console.log("LOGIN RESULT:",data,error);

        if(error){
            console.error("LOGIN ERROR:",error);

            const msg=error.message.toLowerCase();

            if(msg.includes("email not confirmed")){
                showMessage(
                    "Email kamu belum dikonfirmasi.\n\n"+
                    "Silakan buka email dan klik Confirm your email address."
                );
                return;
            }

            showMessage("Login gagal:\n\n"+error.message);
            return;
        }

        if(!data||!data.session){
            showMessage("Login gagal: session tidak ditemukan.");
            return;
        }

        localStorage.setItem("telecod_logged_in","true");

        console.log("LOGIN BERHASIL:",data.user);

        window.location.replace("dashboard.html");

    }catch(error){
        console.error("LOGIN EXCEPTION:",error);

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

document.querySelectorAll(".social-login").forEach(button=>{
    button.addEventListener("click",async()=>{
        if(!checkSupabase())return;

        try{
            const {error}=await supabase.auth.signInWithOAuth({
                provider:"google",
                options:{
                    redirectTo:"https://telecod.biz.id/dashboard.html"
                }
            });

            if(error){
                console.error("GOOGLE ERROR:",error);
                showMessage(error.message);
            }

        }catch(error){
            console.error("GOOGLE EXCEPTION:",error);
            showMessage("Google Login gagal:\n\n"+(error.message||error));
        }
    });
});

// =====================================================
// LOGOUT
// =====================================================

document.querySelectorAll("[data-logout]").forEach(button=>{
    button.addEventListener("click",async()=>{
        if(!checkSupabase())return;

        const success=await logoutUser();

        if(success){
            localStorage.removeItem("telecod_logged_in");
            window.location.replace("index.html");
        }
    });
});
