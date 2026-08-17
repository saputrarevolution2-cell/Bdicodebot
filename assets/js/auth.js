// =====================================================
// REGISTER
// =====================================================

const registerForm =
    document.getElementById("registerForm");


registerForm?.addEventListener("submit", async (event) => {

    event.preventDefault();


    const name =
        document.getElementById("name").value.trim();

    const username =
        document.getElementById("username").value.trim();

    const telegramId =
        document.getElementById("telegramId").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    // ===============================
    // VALIDATION
    // ===============================

    if (password.length < 8) {

        alert("Password minimal 8 karakter.");

        return;
    }


    if (password !== confirmPassword) {

        alert("Konfirmasi password tidak sama.");

        return;
    }


    const button =
        registerForm.querySelector(".auth-submit");


    const originalHTML =
        button.innerHTML;


    button.disabled = true;

    button.innerHTML = `
        <span>Membuat akun...</span>
        <i class="fa-solid fa-spinner fa-spin"></i>
    `;


    try {

        await registerUser(
            email,
            password,
            username,
            name,
            telegramId
        );


        alert(
            "Akun berhasil dibuat! Silakan cek email untuk verifikasi akun."
        );


        window.location.href =
            "login.html";


    } catch (error) {

        console.error(
            "Register error:",
            error
        );


        alert(
            "Gagal membuat akun: " +
            error.message
        );


        button.disabled = false;

        button.innerHTML =
            originalHTML;

    }

});
