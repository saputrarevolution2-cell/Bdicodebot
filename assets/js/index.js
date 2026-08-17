/* =====================================================
   TELECOD - INDEX.JS
===================================================== */

"use strict";


/* =====================================================
   DOM
===================================================== */

const authModal = document.getElementById("authModal");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const pasteContent = document.getElementById("pasteContent");
const saleFields = document.getElementById("saleFields");

const publicTab = document.getElementById("publicTab");
const saleTab = document.getElementById("saleTab");


/* =====================================================
   AUTH MODAL
===================================================== */

function openAuth(type = "login") {

    if (!authModal) {
        return;
    }

    authModal.classList.add("active");

    if (type === "register") {

        if (loginForm) {
            loginForm.style.display = "none";
        }

        if (registerForm) {
            registerForm.style.display = "block";
        }

    } else {

        if (loginForm) {
            loginForm.style.display = "block";
        }

        if (registerForm) {
            registerForm.style.display = "none";
        }

    }

}


/* =====================================================
   CLOSE AUTH
===================================================== */

function closeAuth() {

    if (!authModal) {
        return;
    }

    authModal.classList.remove("active");

}


/* =====================================================
   CLOSE MODAL CLICK OUTSIDE
===================================================== */

if (authModal) {

    authModal.addEventListener("click", function (event) {

        if (event.target === authModal) {

            closeAuth();

        }

    });

}


/* =====================================================
   ESC CLOSE MODAL
===================================================== */

document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeAuth();

    }

});


/* =====================================================
   PASTELINK MODE
===================================================== */

let pasteMode = "public";


function setPasteMode(mode) {

    pasteMode = mode;

    if (!saleFields || !publicTab || !saleTab) {
        return;
    }


    if (mode === "sale") {

        saleFields.style.display = "block";

        publicTab.classList.remove("btn-primary");
        publicTab.classList.add("btn-outline");

        saleTab.classList.remove("btn-outline");
        saleTab.classList.add("btn-primary");

    } else {

        saleFields.style.display = "none";

        publicTab.classList.remove("btn-outline");
        publicTab.classList.add("btn-primary");

        saleTab.classList.remove("btn-primary");
        saleTab.classList.add("btn-outline");

    }

}


/* =====================================================
   CREATE PASTELINK
===================================================== */

function createPaste() {

    if (!pasteContent) {
        return;
    }


    const content = pasteContent.value.trim();


    /* EMPTY */

    if (!content) {

        showToast(
            "Silakan masukkan teks, code atau link terlebih dahulu.",
            "error"
        );

        pasteContent.focus();

        return;

    }


    /* SELL MODE */

    if (pasteMode === "sale") {

        /*
         * Untuk menjual PasteLink,
         * user wajib login.
         */

        openAuth("login");

        return;

    }


    /*
     * PUBLIC MODE
     *
     * Sementara demo.
     * Nanti diganti API backend.
     */

    showToast(
        "PasteLink sedang dibuat...",
        "success"
    );


    setTimeout(function () {

        /*
         * Contoh hasil.
         *
         * Nanti:
         *
         * fetch("/api/paste/create")
         */

        const fakeCode =
            generatePasteCode();

        const fakeUrl =
            window.location.origin +
            "/p/" +
            fakeCode;


        showPasteResult(fakeUrl);

    }, 700);

}


/* =====================================================
   GENERATE PASTE CODE
===================================================== */

function generatePasteCode() {

    const chars =
        "abcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < 8; i++) {

        result +=
            chars.charAt(
                Math.floor(
                    Math.random() * chars.length
                )
            );

    }

    return result;

}


/* =====================================================
   SHOW PASTE RESULT
===================================================== */

function showPasteResult(url) {

    const box =
        document.querySelector(".paste-box");

    if (!box) {
        return;
    }


    let result =
        document.getElementById("pasteResult");


    if (!result) {

        result =
            document.createElement("div");

        result.id =
            "pasteResult";

        result.style.marginTop =
            "15px";

        result.style.padding =
            "13px";

        result.style.borderRadius =
            "12px";

        result.style.background =
            "#ecfdf3";

        result.style.color =
            "#087443";

        result.style.fontSize =
            "13px";

        box.appendChild(result);

    }


    result.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:8px;
            margin-bottom:7px;
            font-weight:800;
        ">

            <i class="fa-solid fa-circle-check"></i>

            PasteLink berhasil dibuat

        </div>

        <div style="
            display:flex;
            gap:7px;
        ">

            <input
                id="generatedPasteUrl"
                value="${url}"
                readonly
                style="
                    flex:1;
                    min-width:0;
                    border:1px solid #d1fae5;
                    border-radius:9px;
                    padding:9px;
                    background:#fff;
                "
            >

            <button
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
   COPY PASTELINK
===================================================== */

async function copyPasteLink() {

    const input =
        document.getElementById(
            "generatedPasteUrl"
        );


    if (!input) {
        return;
    }


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

        document.execCommand("copy");

        showToast(
            "PasteLink berhasil disalin.",
            "success"
        );

    }

}


/* =====================================================
   CLEAR PASTELINK
===================================================== */

function clearPaste() {

    if (pasteContent) {

        pasteContent.value = "";

        pasteContent.focus();

    }


    const pasteResult =
        document.getElementById(
            "pasteResult"
        );


    if (pasteResult) {

        pasteResult.remove();

    }


    const pastePrice =
        document.getElementById(
            "pastePrice"
        );


    const pastePassword =
        document.getElementById(
            "pastePassword"
        );


    if (pastePrice) {

        pastePrice.value = "";

    }


    if (pastePassword) {

        pastePassword.value = "";

    }

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message, type = "success") {

    let toast =
        document.getElementById(
            "telecodToast"
        );


    if (!toast) {

        toast =
            document.createElement("div");

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

        toast.style.maxWidth =
            "calc(100vw - 40px)";

        toast.style.padding =
            "14px 17px";

        toast.style.borderRadius =
            "13px";

        toast.style.color =
            "#fff";

        toast.style.fontSize =
            "13px";

        toast.style.fontWeight =
            "700";

        toast.style.boxShadow =
            "0 12px 30px rgba(0,0,0,.18)";

        document.body.appendChild(toast);

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


    toast.style.opacity = "1";


    clearTimeout(
        window.telecodToastTimer
    );


    window.telecodToastTimer =
        setTimeout(function () {

            toast.style.opacity =
                "0";

        }, 3000);

}


/* =====================================================
   LOGIN DEMO
===================================================== */

if (loginForm) {

    const loginButton =
        loginForm.querySelector(
            ".form-submit"
        );


    if (loginButton) {

        loginButton.addEventListener(
            "click",
            function () {

                const inputs =
                    loginForm.querySelectorAll(
                        "input"
                    );


                const email =
                    inputs[0]?.value.trim();

                const password =
                    inputs[1]?.value;


                if (!email) {

                    showToast(
                        "Masukkan email Anda.",
                        "error"
                    );

                    return;

                }


                if (!password) {

                    showToast(
                        "Masukkan password Anda.",
                        "error"
                    );

                    return;

                }


                /*
                 * BACKEND NANTI:
                 *
                 * fetch("/api/auth/login", {
                 *     method: "POST",
                 *     headers: {
                 *         "Content-Type":
                 *             "application/json"
                 *     },
                 *     body: JSON.stringify({
                 *         email,
                 *         password
                 *     })
                 * })
                 */


                showToast(
                    "Login demo berhasil diproses.",
                    "success"
                );


                setTimeout(function () {

                    closeAuth();

                }, 900);

            }
        );

    }

}


/* =====================================================
   REGISTER DEMO
===================================================== */

if (registerForm) {

    const registerButton =
        registerForm.querySelector(
            ".form-submit"
        );


    if (registerButton) {

        registerButton.addEventListener(
            "click",
            function () {

                const inputs =
                    registerForm.querySelectorAll(
                        "input"
                    );


                const name =
                    inputs[0]?.value.trim();

                const email =
                    inputs[1]?.value.trim();

                const password =
                    inputs[2]?.value;


                if (!name) {

                    showToast(
                        "Masukkan nama Anda.",
                        "error"
                    );

                    return;

                }


                if (!email) {

                    showToast(
                        "Masukkan email Anda.",
                        "error"
                    );

                    return;

                }


                if (!password) {

                    showToast(
                        "Masukkan password Anda.",
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
                 * BACKEND NANTI:
                 *
                 * fetch("/api/auth/register", {
                 *     method: "POST",
                 *     headers: {
                 *         "Content-Type":
                 *             "application/json"
                 *     },
                 *     body: JSON.stringify({
                 *         name,
                 *         email,
                 *         password
                 *     })
                 * })
                 */


                showToast(
                    "Akun berhasil diproses.",
                    "success"
                );


                setTimeout(function () {

                    openAuth("login");

                }, 900);

            }
        );

    }

}


/* =====================================================
   PRODUCT BUY BUTTON
===================================================== */

document
    .querySelectorAll(".product-card .btn")
    .forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const card =
                    button.closest(
                        ".product-card"
                    );


                if (!card) {
                    return;
                }


                const title =
                    card.querySelector(
                        "h3"
                    )?.textContent.trim();


                /*
                 * NANTI:
                 *
                 * window.location.href =
                 * "/product/" + productId;
                 */


                showToast(
                    `Membuka ${title || "produk"}...`,
                    "success"
                );

            }
        );

    });


/* =====================================================
   PAYMENT BUTTON
===================================================== */

const paymentButton =
    document.querySelector(
        ".payment-button"
    );


if (paymentButton) {

    paymentButton.addEventListener(
        "click",
        function () {

            /*
             * NANTI:
             *
             * fetch("/api/payment/create")
             *
             * Kemudian redirect
             * ke halaman payment.
             */

            showToast(
                "Menghubungkan ke payment gateway...",
                "success"
            );

        }
    );

}


/* =====================================================
   SMOOTH NAVIGATION
===================================================== */

document
    .querySelectorAll(
        'a[href^="#"]'
    )
    .forEach(function (link) {

        link.addEventListener(
            "click",
            function (event) {

                const targetId =
                    link.getAttribute(
                        "href"
                    );


                if (
                    !targetId ||
                    targetId === "#"
                ) {

                    return;

                }


                const target =
                    document.querySelector(
                        targetId
                    );


                if (!target) {
                    return;
                }


                event.preventDefault();


                target.scrollIntoView({

                    behavior:"smooth",

                    block:"start"

                });

            }
        );

    });


/* =====================================================
   INITIAL STATE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setPasteMode("public");

    }
);
