/* =========================================================
   PasTele — REGISTER
   PRODUCTION + SUPABASE + CLOUDFLARE TURNSTILE
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     WAIT DOM
     ======================================================= */

  document.addEventListener("DOMContentLoaded", initRegister);

  async function initRegister() {

    /* =====================================================
       DOM
       ===================================================== */

    const form = document.getElementById("reg");
    const errorBox = document.getElementById("authError");
    const noticeBox = document.getElementById("authNotice");
    const submit = document.getElementById("submit");
    const google = document.getElementById("google");

    const turnstileContainer =
      document.getElementById("registerTurnstile");

    const securityStatus =
      document.getElementById("registerSecurityStatus");

    const progress =
      document.getElementById("regProgress");

    /* =====================================================
       SAFETY CHECK
       ===================================================== */

    if (!form) {
      console.error(
        "[PasTele] #reg tidak ditemukan."
      );
      return;
    }

    if (!submit) {
      console.error(
        "[PasTele] #submit tidak ditemukan."
      );
      return;
    }

    /* =====================================================
       STATE
       ===================================================== */

    let turnstileWidgetId = null;
    let turnstileToken = "";
    let submitting = false;
    let turnstileRendering = false;

    /* =====================================================
       SITE KEY
       ===================================================== */

    const siteKey = String(
      turnstileContainer?.dataset?.sitekey ||
      window.PASTELE_TURNSTILE_SITE_KEY ||
      ""
    ).trim();

    console.log(
      "[PasTele] Register config:",
      {
        form: Boolean(form),
        submit: Boolean(submit),
        google: Boolean(google),
        turnstileContainer: Boolean(turnstileContainer),
        siteKey: Boolean(siteKey),
        supabase: Boolean(window.sb),
        authRegister:
          typeof window.Auth?.register === "function"
      }
    );

    /* =====================================================
       HELPERS
       ===================================================== */

    function hide(element) {
      if (!element) return;

      element.classList.add("hidden");
    }

    function show(element, message) {
      if (!element) return;

      element.textContent = String(message || "");

      element.classList.remove("hidden");

      element.classList.add(
        "floating-notice",
        "show"
      );

      clearTimeout(element._timer);

      element._timer = setTimeout(() => {
        element.classList.remove("show");

        setTimeout(() => {
          element.classList.add("hidden");
        }, 220);

      }, 5000);
    }

    /* =====================================================
       TOAST
       ===================================================== */

    function toast(
      message,
      type = "success",
      duration = 5000
    ) {

      let box =
        document.getElementById(
          "pastele-toast"
        );

      if (!box) {

        box =
          document.createElement("div");

        box.id =
          "pastele-toast";

        box.className =
          "pastele-toast";

        document.body.appendChild(box);
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

        <span>
          ${escapeHTML(message)}
        </span>
      `;

      requestAnimationFrame(() => {
        box.classList.add("show");
      });

      clearTimeout(box._timer);

      box._timer =
        setTimeout(() => {
          box.classList.remove("show");
        }, duration);
    }

    /* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHTML(value) {

      return String(value ?? "")
        .replace(
          /[&<>"']/g,
          (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
          })[char]
        );
    }

    /* =====================================================
       SECURITY STATUS
       ===================================================== */

    function updateSecurityStatus(
      verified = false,
      message = ""
    ) {

      if (!securityStatus) return;

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

    /* =====================================================
       SUBMIT BUTTON
       ===================================================== */

    function setSubmitEnabled(enabled) {

      if (submitting) return;

      const state =
        Boolean(enabled);

      submit.disabled =
        !state;

      submit.setAttribute(
        "aria-disabled",
        state ? "false" : "true"
      );

      submit.classList.toggle(
        "is-disabled",
        !state
      );
    }

    /* =====================================================
       TURNSTILE SUCCESS
       ===================================================== */

    function onTurnstileSuccess(token) {

      turnstileToken =
        String(token || "").trim();

      window.__pasTeleRegisterTurnstileToken =
        turnstileToken;

      console.log(
        "[PasTele] Turnstile success:",
        Boolean(turnstileToken)
      );

      if (!turnstileToken) {

        setSubmitEnabled(false);

        updateSecurityStatus(
          false,
          "Verifikasi keamanan gagal."
        );

        updateProgress();

        return;
      }

      updateSecurityStatus(
        true,
        "Verifikasi keamanan berhasil."
      );

      setSubmitEnabled(true);

      updateProgress();
    }

    /* =====================================================
       TURNSTILE EXPIRED
       ===================================================== */

    function onTurnstileExpired() {

      console.warn(
        "[PasTele] Turnstile expired."
      );

      turnstileToken = "";

      window.__pasTeleRegisterTurnstileToken =
        "";

      setSubmitEnabled(false);

      updateSecurityStatus(
        false,
        "Verifikasi kedaluwarsa. Silakan verifikasi kembali."
      );

      updateProgress();
    }

    /* =====================================================
       TURNSTILE ERROR
       ===================================================== */

    function onTurnstileError(errorCode) {

      console.error(
        "[PasTele] Turnstile error:",
        errorCode
      );

      turnstileToken = "";

      window.__pasTeleRegisterTurnstileToken =
        "";

      setSubmitEnabled(false);

      updateSecurityStatus(
        false,
        "Verifikasi keamanan gagal dimuat. Silakan coba lagi."
      );

      updateProgress();
    }

    /* =====================================================
       GET TURNSTILE TOKEN
       ===================================================== */

    function getTurnstileToken() {

      if (turnstileToken) {
        return turnstileToken;
      }

      const globalToken =
        String(
          window.__pasTeleRegisterTurnstileToken ||
          ""
        ).trim();

      if (globalToken) {
        return globalToken;
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

        } catch (error) {

          console.warn(
            "[PasTele] Turnstile getResponse error:",
            error
          );
        }
      }

      const textarea =
        document.querySelector(
          'textarea[name="cf-turnstile-response"]'
        );

      return String(
        textarea?.value || ""
      ).trim();
    }

    /* =====================================================
       RESET TURNSTILE
       ===================================================== */

    function resetTurnstile() {

      turnstileToken = "";

      window.__pasTeleRegisterTurnstileToken =
        "";

      setSubmitEnabled(false);

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

      updateProgress();
    }

    /* =====================================================
       WAIT CLOUDFLARE
       ===================================================== */

    function waitForTurnstile(
      timeout = 20000
    ) {

      return new Promise((resolve) => {

        const started =
          Date.now();

        function check() {

          if (
            window.turnstile &&
            typeof window.turnstile.render ===
              "function"
          ) {

            resolve(true);

            return;
          }

          if (
            Date.now() - started >=
            timeout
          ) {

            resolve(false);

            return;
          }

          setTimeout(
            check,
            250
          );
        }

        check();
      });
    }

    /* =====================================================
       RENDER TURNSTILE
       ===================================================== */

    async function renderTurnstile() {

      if (!turnstileContainer) {

        console.error(
          "[PasTele] #registerTurnstile tidak ditemukan."
        );

        updateSecurityStatus(
          false,
          "Elemen verifikasi keamanan tidak ditemukan."
        );

        return;
      }

      if (!siteKey) {

        console.error(
          "[PasTele] Turnstile sitekey kosong."
        );

        updateSecurityStatus(
          false,
          "Site Key Turnstile belum dikonfigurasi."
        );

        setSubmitEnabled(false);

        return;
      }

      if (turnstileWidgetId !== null) {
        return;
      }

      if (turnstileRendering) {
        return;
      }

      turnstileRendering = true;

      try {

        updateSecurityStatus(
          false,
          "Memuat verifikasi keamanan..."
        );

        const ready =
          await waitForTurnstile();

        if (!ready) {

          throw new Error(
            "Cloudflare Turnstile tidak tersedia."
          );
        }

        /*
         * Bersihkan container.
         * Mencegah widget double-render.
         */

        turnstileContainer.innerHTML = "";

        turnstileWidgetId =
          window.turnstile.render(
            turnstileContainer,
            {
              sitekey: siteKey,

              theme: "auto",

              language: "id",

              size: "flexible",

              action: "register",

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

        console.log(
          "[PasTele] Turnstile rendered:",
          turnstileWidgetId
        );

        updateSecurityStatus(
          false,
          "Selesaikan verifikasi keamanan terlebih dahulu."
        );

      } catch (error) {

        console.error(
          "[PasTele] Turnstile render error:",
          error
        );

        updateSecurityStatus(
          false,
          "Verifikasi keamanan tidak dapat dimuat."
        );

        setSubmitEnabled(false);

      } finally {

        turnstileRendering = false;
      }
    }

    /* =====================================================
       PROGRESS
       ===================================================== */

    const fields = [
      "username",
      "email",
      "password",
      "confirm"
    ]
      .map((id) =>
        document.getElementById(id)
      )
      .filter(Boolean);

    function updateProgress() {

      const username =
        document
          .getElementById("username")
          ?.value
          .trim() || "";

      const email =
        document
          .getElementById("email")
          ?.value
          .trim() || "";

      const password =
        document
          .getElementById("password")
          ?.value || "";

      const confirm =
        document
          .getElementById("confirm")
          ?.value || "";

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
        confirm.length >= 6 &&
        password === confirm
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
            (score / 6) * 100
          )
        );

      if (progress) {

        progress.style.width =
          `${percentage}%`;
      }
    }

    fields.forEach((field) => {

      field.addEventListener(
        "input",
        updateProgress
      );

      field.addEventListener(
        "change",
        updateProgress
      );
    });

    /* =====================================================
       PASSWORD TOGGLE
       ===================================================== */

    document
      .querySelectorAll(".toggle")
      .forEach((button) => {

        button.addEventListener(
          "click",
          () => {

            const target =
              button.dataset.t;

            const input =
              document.getElementById(
                target
              );

            if (!input) return;

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
      });

    /* =====================================================
       REGISTER SUBMIT
       ===================================================== */

    form.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        if (submitting) {
          return;
        }

        hide(errorBox);
        hide(noticeBox);

        const username =
          document
            .getElementById("username")
            ?.value
            .trim() || "";

        const email =
          document
            .getElementById("email")
            ?.value
            .trim()
            .toLowerCase() || "";

        const password =
          document
            .getElementById("password")
            ?.value || "";

        const confirm =
          document
            .getElementById("confirm")
            ?.value || "";

        /* =================================================
           VALIDATION
           ================================================= */

        if (
          !/^[A-Za-z0-9_]{3,32}$/.test(
            username
          )
        ) {

          show(
            errorBox,
            "Username hanya boleh berisi huruf, angka, dan underscore (3–32 karakter)."
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
          password !== confirm
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

        /* =================================================
           TURNSTILE TOKEN
           ================================================= */

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

          setSubmitEnabled(false);

          return;
        }

        /* =================================================
           SUBMITTING
           ================================================= */

        submitting = true;

        submit.disabled = true;

        submit.setAttribute(
          "aria-disabled",
          "true"
        );

        const originalHTML =
          submit.innerHTML;

        submit.innerHTML =
          `
          <i class="fa-solid fa-spinner fa-spin"
             aria-hidden="true"></i>
          <span>Membuat akun...</span>
          `;

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

          /*
           * PENTING:
           * Token Turnstile dikirim
           * ke Auth.register().
           */

          const data =
            await window.Auth.register(
              username,
              email,
              password,
              token
            );

          /* =================================================
             SESSION LANGSUNG
             ================================================= */

          if (data?.session) {

            toast(
              "Akun PasTele berhasil dibuat. Selamat datang!",
              "success"
            );

            submit.innerHTML =
              `
              <i class="fa-solid fa-check"
                 aria-hidden="true"></i>
              <span>Berhasil</span>
              `;

            setTimeout(() => {

              location.replace(
                "dashboard.html"
              );

            }, 900);

            return;
          }

          /* =================================================
             EMAIL CONFIRMATION
             ================================================= */

          toast(
            "Akun berhasil dibuat. Cek Gmail untuk verifikasi akun PasTele.",
            "success"
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
            "error"
          );

          show(
            errorBox,
            message
          );

          resetTurnstile();

        } finally {

          submitting = false;

          submit.innerHTML =
            `
            <i class="fa-solid fa-user-plus"
               aria-hidden="true"></i>
            <span>Register</span>
            `;

          if (
            getTurnstileToken()
          ) {

            setSubmitEnabled(true);

          } else {

            setSubmitEnabled(false);
          }

          updateProgress();
        }
      }
    );

    /* =====================================================
       GOOGLE REGISTER
       ===================================================== */

    if (google) {

      google.addEventListener(
        "click",
        async () => {

          if (submitting) {
            return;
          }

          hide(errorBox);
          hide(noticeBox);

          const originalHTML =
            google.innerHTML;

          google.disabled = true;

          google.setAttribute(
            "aria-disabled",
            "true"
          );

          google.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"
               aria-hidden="true"></i>
            <span>Menghubungkan Google...</span>
            `;

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
              "error"
            );

            show(
              errorBox,
              message
            );

            google.disabled = false;

            google.setAttribute(
              "aria-disabled",
              "false"
            );

            google.innerHTML =
              originalHTML;
          }
        }
      );
    }

    /* =====================================================
       INITIAL STATE
       ===================================================== */

    setSubmitEnabled(false);

    updateSecurityStatus(
      false,
      "Memuat verifikasi keamanan..."
    );

    updateProgress();

    /* =====================================================
       START TURNSTILE
       ===================================================== */

    await renderTurnstile();

    /* =====================================================
       FINAL DEBUG
       ===================================================== */

    console.log(
      "[PasTele] Register initialized.",
      {
        turnstileContainer:
          Boolean(turnstileContainer),

        turnstileSiteKey:
          Boolean(siteKey),

        turnstileLoaded:
          Boolean(window.turnstile),

        turnstileWidgetId:
          turnstileWidgetId,

        supabase:
          Boolean(window.sb),

        authRegister:
          typeof window.Auth?.register ===
          "function",

        authGoogle:
          typeof window.Auth?.google ===
          "function"
      }
    );
  }

})();
