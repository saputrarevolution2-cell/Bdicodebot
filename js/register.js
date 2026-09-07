/* =========================================================
PasTele — REGISTER
PRODUCTION + SUPABASE + CLOUDFLARE TURNSTILE
========================================================= */

document.addEventListener(“DOMContentLoaded”, () => {
“use strict”;

/* =======================================================
DOM
======================================================= */

const form =
document.getElementById(“reg”);

const errorBox =
document.getElementById(“authError”);

const noticeBox =
document.getElementById(“authNotice”);

const submit =
document.getElementById(“submit”);

const google =
document.getElementById(“google”);

const turnstileContainer =
document.getElementById(
“registerTurnstile”
);

const securityStatus =
document.getElementById(
“registerSecurityStatus”
);

const progress =
document.getElementById(
“regProgress”
);

/* =======================================================
SAFETY CHECK
======================================================= */

if (!form) {
console.warn(
“[PasTele] Register form #reg tidak ditemukan.”
);
return;
}

if (!submit) {
console.warn(
“[PasTele] Register button #submit tidak ditemukan.”
);
return;
}

/* =======================================================
STATE
======================================================= */

let turnstileWidgetId = null;
let turnstileToken = “”;
let turnstileRendering = false;
let submitting = false;

const siteKey =
String(
turnstileContainer?.dataset?.sitekey ||
window.PASTELE_TURNSTILE_SITE_KEY ||
“”
).trim();

/* =======================================================
UI HELPERS
======================================================= */

const hide = (element) => {
if (!element) return;

element.classList.add("hidden");

};

const show = (
element,
message
) => {
if (!element) return;

element.textContent =
  String(message || "");
element.classList.remove(
  "hidden"
);
element.classList.add(
  "floating-notice",
  "show"
);
clearTimeout(
  element._timer
);
element._timer =
  setTimeout(() => {
    element.classList.remove(
      "show"
    );
    setTimeout(() => {
      element.classList.add(
        "hidden"
      );
    }, 220);
  }, 5000);

};

/* =======================================================
TOAST
======================================================= */

const toast = (
message,
type = “success”,
duration = 5000
) => {
let box =
document.getElementById(
“pastele-toast”
);

if (!box) {
  box =
    document.createElement(
      "div"
    );
  box.id =
    "pastele-toast";
  box.className =
    "pastele-toast";
  document.body.appendChild(
    box
  );
}
const icon =
  type === "success"
    ? '<i class="fa-solid fa-check"></i>'
    : '<i class="fa-solid fa-circle-exclamation"></i>';
box.className =
  `pastele-toast ${type}`;
box.innerHTML = `
  <span class="pastele-toast-icon">
    ${icon}
  </span>
  <span>${escapeHTML(message)}</span>
`;
requestAnimationFrame(() => {
  box.classList.add(
    "show"
  );
});
clearTimeout(
  box._timer
);
box._timer =
  setTimeout(() => {
    box.classList.remove(
      "show"
    );
  }, duration);

};

/* =======================================================
ESCAPE TOAST TEXT
======================================================= */

function escapeHTML(value) {
return String(
value ?? “”
).replace(
/[&<>”’]/g,
(char) => ({
“&”: “&”,
“<”: “<”,
“>”: “>”,
‘”’: “"”,
“’”: “'”
}[char])
);
}

/* =======================================================
SECURITY STATUS
======================================================= */

function updateSecurityStatus(
verified = false,
message = “”
) {
if (!securityStatus) {
return;
}

securityStatus.textContent =
  message ||
  (
    verified
      ? "Verifikasi keamanan berhasil."
      : "Selesaikan verifikasi keamanan terlebih dahulu."
  );
securityStatus.classList.remove(
  "success",
  "error"
);
if (verified) {
  securityStatus.classList.add(
    "success"
  );
}

}

/* =======================================================
REGISTER BUTTON
======================================================= */

function setSubmitEnabled(
enabled
) {
if (submitting) {
return;
}

const state =
  Boolean(enabled);
submit.disabled =
  !state;
submit.setAttribute(
  "aria-disabled",
  state
    ? "false"
    : "true"
);

}

/* =======================================================
TURNSTILE SUCCESS
======================================================= */

function onTurnstileSuccess(
token
) {
turnstileToken =
String(
token || “”
).trim();

window.__pasTeleRegisterTurnstileToken =
  turnstileToken;
const verified =
  Boolean(
    turnstileToken
  );
if (verified) {
  updateSecurityStatus(
    true,
    "Verifikasi keamanan berhasil."
  );
  setSubmitEnabled(
    true
  );
} else {
  setSubmitEnabled(
    false
  );
  updateSecurityStatus(
    false,
    "Selesaikan verifikasi keamanan terlebih dahulu."
  );
}

}

/* =======================================================
TURNSTILE EXPIRED
======================================================= */

function onTurnstileExpired() {
turnstileToken =
“”;

window.__pasTeleRegisterTurnstileToken =
  "";
setSubmitEnabled(
  false
);
updateSecurityStatus(
  false,
  "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
);

}

/* =======================================================
TURNSTILE ERROR
======================================================= */

function onTurnstileError(
errorCode
) {
console.warn(
“[PasTele] Register Turnstile error:”,
errorCode
);

turnstileToken =
  "";
window.__pasTeleRegisterTurnstileToken =
  "";
setSubmitEnabled(
  false
);
updateSecurityStatus(
  false,
  "Verifikasi keamanan gagal. Silakan coba lagi."
);

}

/* =======================================================
RESET TURNSTILE
======================================================= */

function resetTurnstile() {
turnstileToken =
“”;

window.__pasTeleRegisterTurnstileToken =
  "";
setSubmitEnabled(
  false
);
if (
  window.turnstile &&
  turnstileWidgetId !== null
) {
  try {
    window.turnstile.reset(
      turnstileWidgetId
    );
  } catch (error) {
    console.warn(
      "[PasTele] Turnstile reset error:",
      error
    );
  }
}
updateSecurityStatus(
  false,
  "Selesaikan verifikasi keamanan terlebih dahulu."
);

}

/* =======================================================
GET TURNSTILE TOKEN
======================================================= */

function getTurnstileToken() {
const local =
String(
turnstileToken || “”
).trim();

if (local) {
  return local;
}
const global =
  String(
    window.__pasTeleRegisterTurnstileToken ||
    ""
  ).trim();
if (global) {
  return global;
}
if (
  window.turnstile &&
  turnstileWidgetId !== null
) {
  try {
    const response =
      window.turnstile.getResponse(
        turnstileWidgetId
      );
    if (response) {
      return String(
        response
      ).trim();
    }
  } catch (_) {}
}
const textarea =
  document.querySelector(
    'textarea[name="cf-turnstile-response"]'
  );
return String(
  textarea?.value || ""
).trim();

}

/* =======================================================
WAIT FOR TURNSTILE
======================================================= */

function waitForTurnstile(
timeout = 15000
) {
return new Promise(
(resolve) => {
const started =
Date.now();

    const check =
      () => {
        if (
          window.turnstile &&
          typeof window.turnstile.render ===
            "function"
        ) {
          resolve(true);
          return;
        }
        if (
          Date.now() -
            started >=
          timeout
        ) {
          resolve(false);
          return;
        }
        setTimeout(
          check,
          250
        );
      };
    check();
  }
);

}

/* =======================================================
RENDER TURNSTILE
======================================================= */

async function renderTurnstile() {
if (
!turnstileContainer
) {
console.warn(
“[PasTele] #registerTurnstile tidak ditemukan.”
);
return;
}

if (
  turnstileWidgetId !== null
) {
  return;
}
if (
  turnstileRendering
) {
  return;
}
if (!siteKey) {
  console.error(
    "[PasTele] Register Turnstile sitekey tidak ditemukan."
  );
  updateSecurityStatus(
    false,
    "Konfigurasi verifikasi keamanan belum tersedia."
  );
  setSubmitEnabled(
    false
  );
  return;
}
turnstileRendering =
  true;
try {
  const ready =
    await waitForTurnstile();
  if (!ready) {
    console.error(
      "[PasTele] Cloudflare Turnstile belum tersedia."
    );
    updateSecurityStatus(
      false,
      "Verifikasi keamanan tidak dapat dimuat. Periksa koneksi atau konfigurasi Turnstile."
    );
    setSubmitEnabled(
      false
    );
    return;
  }
  if (
    turnstileWidgetId !== null
  ) {
    return;
  }
  turnstileWidgetId =
    window.turnstile.render(
      turnstileContainer,
      {
        sitekey:
          siteKey,
        theme:
          "auto",
        language:
          "id",
        size:
          "flexible",
        action:
          "register",
        callback:
          onTurnstileSuccess,
        "expired-callback":
          onTurnstileExpired,
        "error-callback":
          onTurnstileError,
        "timeout-callback":
          onTurnstileExpired
      }
    );
} catch (error) {
  console.error(
    "[PasTele] Register Turnstile render error:",
    error
  );
  updateSecurityStatus(
    false,
    "Verifikasi keamanan tidak dapat dimuat."
  );
  setSubmitEnabled(
    false
  );
} finally {
  turnstileRendering =
    false;
}

}

/* =======================================================
REGISTER PROGRESS
======================================================= */

const fields = [
“username”,
“email”,
“password”,
“confirm”
]
.map(
(id) =>
document.getElementById(
id
)
)
.filter(Boolean);

function updateProgress() {
const username =
document.getElementById(
“username”
)?.value.trim() ||
“”;

const email =
  document.getElementById(
    "email"
  )?.value.trim() ||
  "";
const password =
  document.getElementById(
    "password"
  )?.value ||
  "";
const confirm =
  document.getElementById(
    "confirm"
  )?.value ||
  "";
let score = 0;
if (
  username.length >= 3
) {
  score++;
}
if (
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  )
) {
  score++;
}
if (
  password.length >= 6
) {
  score++;
}
if (
  confirm.length >= 6
) {
  score++;
}
if (
  password &&
  confirm &&
  password === confirm
) {
  score++;
}
if (
  getTurnstileToken()
) {
  score++;
}
const percentage =
  Math.min(
    100,
    Math.round(
      (score / 6) *
        100
    )
  );
if (progress) {
  progress.style.width =
    `${percentage}%`;
}

}

fields.forEach(
(field) => {
field.addEventListener(
“input”,
updateProgress
);

  field.addEventListener(
    "change",
    updateProgress
  );
}

);

/* =======================================================
PASSWORD TOGGLE
======================================================= */

document
.querySelectorAll(
“.toggle”
)
.forEach(
(button) => {
button.addEventListener(
“click”,
() => {
const target =
button.dataset.t;

        const input =
          document.getElementById(
            target
          );
        if (!input) {
          return;
        }
        const visible =
          input.type ===
          "password";
        input.type =
          visible
            ? "text"
            : "password";
        button.innerHTML =
          visible
            ? '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-eye" aria-hidden="true"></i>';
        button.setAttribute(
          "aria-label",
          visible
            ? "Sembunyikan kata sandi"
            : "Tampilkan kata sandi"
        );
        button.setAttribute(
          "title",
          visible
            ? "Sembunyikan kata sandi"
            : "Tampilkan kata sandi"
        );
      }
    );
  }
);

/* =======================================================
FORM SUBMIT
======================================================= */

form.addEventListener(
“submit”,
async (event) => {
event.preventDefault();

  if (submitting) {
    return;
  }
  hide(errorBox);
  hide(noticeBox);
  const username =
    document
      .getElementById(
        "username"
      )
      ?.value
      .trim() ||
    "";
  const email =
    document
      .getElementById(
        "email"
      )
      ?.value
      .trim()
      .toLowerCase() ||
    "";
  const password =
    document
      .getElementById(
        "password"
      )
      ?.value ||
    "";
  const confirm =
    document
      .getElementById(
        "confirm"
      )
      ?.value ||
    "";
  /* -----------------------------------------------------
     VALIDATION
     ----------------------------------------------------- */
  if (
    !/^[A-Za-z0-9_]{3,32}$/.test(
      username
    )
  ) {
    show(
      errorBox,
      "Username hanya boleh berisi huruf, angka, dan underscore."
    );
    return;
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    show(
      errorBox,
      "Email tidak valid."
    );
    return;
  }
  if (
    password.length < 6
  ) {
    show(
      errorBox,
      "Kata sandi minimal 6 karakter."
    );
    return;
  }
  if (
    password !==
    confirm
  ) {
    show(
      errorBox,
      "Konfirmasi kata sandi tidak cocok."
    );
    return;
  }
  if (!window.sb) {
    show(
      errorBox,
      "Supabase belum terkonfigurasi."
    );
    return;
  }
  /* -----------------------------------------------------
     TURNSTILE
     ----------------------------------------------------- */
  const token =
    getTurnstileToken();
  if (!token) {
    show(
      errorBox,
      "Selesaikan verifikasi keamanan terlebih dahulu."
    );
    updateSecurityStatus(
      false,
      "Selesaikan verifikasi keamanan terlebih dahulu."
    );
    setSubmitEnabled(
      false
    );
    return;
  }
  /* -----------------------------------------------------
     SUBMIT STATE
     ----------------------------------------------------- */
  submitting = true;
  submit.disabled =
    true;
  submit.setAttribute(
    "aria-disabled",
    "true"
  );
  const originalHTML =
    submit.innerHTML;
  submit.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Membuat akun...</span>';
  try {
    if (
      !window.Auth ||
      typeof window.Auth.register !==
        "function"
    ) {
      throw new Error(
        "Sistem autentikasi belum siap."
      );
    }
    /* ---------------------------------------------------
       REGISTER + TURNSTILE TOKEN
       --------------------------------------------------- */
    const data =
      await window.Auth.register(
        username,
        email,
        password,
        token
      );
    /* ---------------------------------------------------
       SESSION AVAILABLE
       --------------------------------------------------- */
    if (
      data?.session
    ) {
      toast(
        "Akun PasTele berhasil dibuat. Selamat datang!",
        "success",
        5000
      );
      submit.innerHTML =
        '<i class="fa-solid fa-check" aria-hidden="true"></i><span>Berhasil</span>';
      turnstileToken =
        "";
      window.__pasTeleRegisterTurnstileToken =
        "";
      setTimeout(
        () => {
          location.replace(
            "dashboard.html"
          );
        },
        900
      );
      return;
    }
    /* ---------------------------------------------------
       EMAIL CONFIRMATION ENABLED
       --------------------------------------------------- */
    toast(
      "Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele.",
      "success",
      5000
    );
    show(
      noticeBox,
      "Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele."
    );
    form.reset();
    resetTurnstile();
    updateProgress();
  } catch (error) {
    console.error(
      "[PasTele] REGISTER ERROR:",
      error
    );
    const message =
      error?.message ||
      "Registrasi gagal.";
    toast(
      message,
      "error",
      5000
    );
    show(
      errorBox,
      message
    );
    resetTurnstile();
    updateProgress();
  } finally {
    submitting =
      false;
    submit.innerHTML =
      '<i class="fa-solid fa-user-plus" aria-hidden="true"></i><span>Register</span>';
    /*
     * Jangan langsung enable tombol di sini.
     * Tombol hanya boleh aktif jika Turnstile
     * masih memiliki token valid.
     */
    if (
      getTurnstileToken()
    ) {
      setSubmitEnabled(
        true
      );
    } else {
      setSubmitEnabled(
        false
      );
    }
    updateProgress();
  }
}

);

/* =======================================================
GOOGLE REGISTER
======================================================= */

google?.addEventListener(
“click”,
async () => {
if (submitting) {
return;
}

  hide(errorBox);
  hide(noticeBox);
  const originalHTML =
    google.innerHTML;
  google.disabled =
    true;
  google.setAttribute(
    "aria-disabled",
    "true"
  );
  google.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Menghubungkan Google...</span>';
  try {
    if (
      !window.Auth ||
      typeof window.Auth.google !==
        "function"
    ) {
      throw new Error(
        "Sistem Google Authentication belum siap."
      );
    }
    await window.Auth.google();
  } catch (error) {
    console.error(
      "[PasTele] GOOGLE REGISTER ERROR:",
      error
    );
    const message =
      error?.message ||
      "Google register gagal.";
    toast(
      message,
      "error",
      5000
    );
    show(
      errorBox,
      message
    );
    google.disabled =
      false;
    google.setAttribute(
      "aria-disabled",
      "false"
    );
    google.innerHTML =
      originalHTML;
  }
}

);

/* =======================================================
INITIAL STATE
======================================================= */

setSubmitEnabled(
false
);

updateSecurityStatus(
false,
“Selesaikan verifikasi keamanan terlebih dahulu.”
);

updateProgress();

/* =======================================================
START TURNSTILE
======================================================= */

renderTurnstile();

console.log(
“[PasTele] Register initialized.”,
{
turnstile:
Boolean(
turnstileContainer
),
turnstileSiteKey:
Boolean(siteKey),
supabase:
Boolean(window.sb),
authRegister:
typeof window.Auth?.register ===
“function”
}
);
});
