"use strict";

/* =====================================================
   TELECOD INDEX JS
===================================================== */

let pasteMode = "public";


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initAuth();

    initPaste();

    initProducts();

    initPayment();

    initSmoothScroll();

});


/* =====================================================
   AUTH
===================================================== */

function initAuth() {

    const modal = document.getElementById("authModal");

    if (!modal) return;


    modal.addEventListener("click", (event) => {

        if (event.target === modal) {

            closeAuth();

        }

    });


    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            closeAuth();

        }

    });


    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");


    /* LOGIN */

    if (loginForm) {

        const button =
            loginForm.querySelector(".form-submit");


        button?.addEventListener("click", () => {

            const inputs =
                loginForm.querySelectorAll("input");


            const email =
                inputs[0]?.value.trim();

            const password =
                inputs[1]?.value;


            if (!email) {

                showToast(
                    "Email wajib diisi.",
                    "error"
                );

                return;

            }


            if (!validateEmail(email)) {

                showToast(
                    "Format email tidak valid.",
                    "error"
                );

                return;

            }


            if (!password) {

                showToast(
                    "Password wajib diisi.",
                    "error"
                );

                return;

            }


            /*
             * NANTI HUBUNGKAN KE BACKEND:
             *
             * POST /api/auth/login
             */

            showToast(
                "Login sedang diproses...",
                "success"
            );

        });

    }


    /* REGISTER */

    if (registerForm) {

        const button =
            registerForm.querySelector(".form-submit");


        button?.addEventListener("click", () => {

            const inputs =
                registerForm.querySelectorAll("input");


            const name =
                inputs[0]?.value.trim();

            const email =
                inputs[1]?.value.trim();

            const password =
                inputs[2]?.value;


            if (!name) {

                showToast(
                    "Nama wajib diisi.",
                    "error"
                );

                return;

            }


            if (!email) {

                showToast(
                    "Email wajib diisi.",
                    "error"
                );

                return;

            }


            if (!validateEmail(email)) {

                showToast(
                    "Format email tidak valid.",
                    "error"
                );

                return;

            }


            if (!password) {

                showToast(
                    "Password wajib diisi.",
                    "error"
                );

                return;

            }


            if (password.length < 8) {

                showToast(
                    "Password minimal 8 karakter.",
                    "error"
                );

                return;

            }


            /*
             * NANTI HUBUNGKAN KE BACKEND:
             *
             * POST /api/auth/register
             */

            showToast(
                "Registrasi sedang diproses...",
                "success"
            );

        });

    }

}


/* =====================================================
   OPEN AUTH
===================================================== */

function openAuth(type = "login") {

    const modal =
        document.getElementById("authModal");

    const login =
        document.getElementById("loginForm");

    const register =
        document.getElementById("registerForm");


    if (!modal) return;


    modal.classList.add("active");


    if (type === "register") {

        if (login)
            login.style.display = "none";

        if (register)
            register.style.display = "block";

    } else {

        if (login)
            login.style.display = "block";

        if (register)
            register.style.display = "none";

    }

}


/* =====================================================
   CLOSE AUTH
===================================================== */

function closeAuth() {

    const modal =
        document.getElementById("authModal");


    if (!modal) return;


    modal.classList.remove("active");

}


/* =====================================================
   PASTELINK
===================================================== */

function initPaste() {

    setPasteMode("public");

}


/* =====================================================
   SET PASTE MODE
===================================================== */

function setPasteMode(mode) {

    pasteMode = mode;


    const saleFields =
        document.getElementById("saleFields");

    const publicTab =
        document.getElementById("publicTab");

    const saleTab =
        document.getElementById("saleTab");


    if (!saleFields ||
        !publicTab ||
        !saleTab) {

        return;

    }


    if (mode === "sale") {

        saleFields.style.display =
            "block";


        publicTab.classList.remove(
            "btn-primary"
        );

        publicTab.classList.add(
            "btn-outline"
        );


        saleTab.classList.remove(
            "btn-outline"
        );

        saleTab.classList.add(
            "btn-primary"
        );

    } else {

        saleFields.style.display =
            "none";


        publicTab.classList.remove(
            "btn-outline"
        );

        publicTab.classList.add(
            "btn-primary"
        );


        saleTab.classList.remove(
            "btn-primary"
        );

        saleTab.classList.add(
            "btn-outline"
        );

    }

}


/* =====================================================
   CREATE PASTE
===================================================== */

function createPaste() {

    const textarea =
        document.getElementById(
            "pasteContent"
        );


    if (!textarea) return;


    const content =
        textarea.value.trim();


    if (!content) {

        showToast(
            "Masukkan teks, code atau link terlebih dahulu.",
            "error"
        );

        textarea.focus();

        return;

    }


    /*
     * MODE JUAL
     *
     * Harus login terlebih dahulu.
     */

    if (pasteMode === "sale") {

        showToast(
            "Login diperlukan untuk menjual PasteLink.",
            "error"
        );


        setTimeout(() => {

            openAuth("login");

        }, 500);


        return;

    }


    /*
     * MODE PUBLIC
     *
     * Untuk sementara membuat kode demo.
     *
     * NANTI:
     *
     * POST /api/paste/create
     */

    const code =
        generatePasteCode();


    const url =
        window.location.origin +
        "/p/" +
        code;


    showPasteResult(url);

}


/* =====================================================
   GENERATE PASTE CODE
===================================================== */

function generatePasteCode() {

    const chars =
        "abcdefghijklmnopqrstuvwxyz0123456789";


    let code = "";


    for (
        let i = 0;
        i < 8;
        i++
    ) {

        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }


    return code;

}


/* =====================================================
   SHOW PASTE RESULT
===================================================== */

function showPasteResult(url) {

    const box =
        document.querySelector(
            ".paste-box"
        );


    if (!box) return;


    let result =
        document.getElementById(
            "pasteResult"
        );


    if (!result) {

        result =
            document.createElement("div");

        result.id =
            "pasteResult";

        result.style.marginTop =
            "15px";

        result.style.padding =
            "14px";

        result.style.borderRadius =
            "14px";

        result.style.background =
            "#ecfdf3";

        result.style.color =
            "#087443";

        box.appendChild(result);

    }


    result.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:8px;
            font-weight:800;
            margin-bottom:8px;
        ">

            <i class="fa-solid fa-circle-check"></i>

            PasteLink berhasil dibuat

        </div>


        <div style="
            display:flex;
            gap:8px;
        ">

            <input
                id="generatedPasteUrl"
                value="${url}"
                readonly
                style="
                    flex:1;
                    min-width:0;
                    padding:10px;
                    border:1px solid #d1fae5;
                    border-radius:10px;
                "
            >


            <button
                type="button"
                class="btn btn-primary"
                onclick="copyPasteLink()"
            >

                <i class="fa-solid fa-copy"></i>

                Copy

            </button>

        </div>

    `;

}


/* =====================================================
   COPY PASTE LINK
===================================================== */

async function copyPasteLink() {

    const input =
        document.getElementById(
            "generatedPasteUrl"
        );


    if (!input) return;


    try {

        await navigator.clipboard.writeText(
            input.value
        );


        showToast(
            "PasteLink berhasil disalin.",
            "success"
        );


    } catch (error) {

        input.select();

        document.execCommand(
            "copy"
        );


        showToast(
            "PasteLink berhasil disalin.",
            "success"
        );

    }

}


/* =====================================================
   CLEAR PASTE
===================================================== */

function clearPaste() {

    const textarea =
        document.getElementById(
            "pasteContent"
        );


    const price =
        document.getElementById(
            "pastePrice"
        );


    const password =
        document.getElementById(
            "pastePassword"
        );


    if (textarea)
        textarea.value = "";


    if (price)
        price.value = "";


    if (password)
        password.value = "";


    const result =
        document.getElementById(
            "pasteResult"
        );


    if (result)
        result.remove();


    if (textarea)
        textarea.focus();

}


/* =====================================================
   PRODUCTS
===================================================== */

function initProducts() {

    document
        .querySelectorAll(
            ".product-card .btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const card =
                        button.closest(
                            ".product-card"
                        );


                    const title =
                        card
                        ?.querySelector("h3")
                        ?.textContent
                        .trim();


                    showToast(
                        `Membuka ${title || "produk"}...`,
                        "success"
                    );

                }
            );

        });

}


/* =====================================================
   PAYMENT
===================================================== */

function initPayment() {

    const button =
        document.querySelector(
            ".payment-button"
        );


    if (!button) return;


    button.addEventListener(
        "click",
        () => {

            /*
             * NANTI:
             *
             * POST /api/payment/create
             *
             * kemudian redirect
             * ke payment gateway.
             */

            showToast(
                "Menghubungkan ke pembayaran...",
                "success"
            );

        }
    );

}


/* =====================================================
   SMOOTH SCROLL
===================================================== */

function initSmoothScroll() {

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                event => {

                    const id =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        !id ||
                        id === "#"
                    ) {

                        return;

                    }


                    const target =
                        document.querySelector(
                            id
                        );


                    if (!target) return;


                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }
            );

        });

}


/* =====================================================
   EMAIL VALIDATION
===================================================== */

function validateEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "telecodToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "telecodToast";


        toast.style.position =
            "fixed";

        toast.style.right =
            "20px";

        toast.style.bottom =
            "20px";

        toast.style.zIndex =
            "99999";

        toast.style.padding =
            "13px 17px";

        toast.style.borderRadius =
            "13px";

        toast.style.color =
            "#fff";

        toast.style.fontSize =
            "13px";

        toast.style.fontWeight =
            "700";

        toast.style.boxShadow =
            "0 12px 30px rgba(0,0,0,.2)";

        toast.style.transition =
            "opacity .25s ease";


        document.body.appendChild(
            toast
        );

    }


    toast.style.background =
        type === "error"
            ? "#ef4444"
            : "#12b76a";


    toast.innerHTML = `

        <i class="${
            type === "error"
                ? "fa-solid fa-circle-exclamation"
                : "fa-solid fa-circle-check"
        }"></i>

        ${message}

    `;


    toast.style.opacity =
        "1";


    clearTimeout(
        window.telecodToastTimer
    );


    window.telecodToastTimer =
        setTimeout(() => {

            toast.style.opacity =
                "0";

        }, 3000);

}


/* =====================================================
   GLOBAL
   Karena HTML menggunakan onclick=""
===================================================== */

window.openAuth =
    openAuth;

window.closeAuth =
    closeAuth;

window.setPasteMode =
    setPasteMode;

window.createPaste =
    createPaste;

window.clearPaste =
    clearPaste;

window.copyPasteLink =
    copyPasteLink;
