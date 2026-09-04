/* =========================================================
   PasTele — Profile
   Canonical page script
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) =>
    document.getElementById(id);
  /* =======================================================
     AUTH
     ======================================================= */
  const profile =
    await TC.profile();
  if (!profile) {
    location.replace("login.html");
    return;
  }
  const p = profile;
  const esc =
    (value) =>
      TC.esc(String(value ?? ""));
  /* =======================================================
     BASIC PROFILE
     ======================================================= */
  const name =
    p.display_name ||
    p.username ||
    "User";
  const avatar =
    $("avatar");
  const nameEl =
    $("name");
  const bioEl =
    $("bio");
  if (nameEl) {
    nameEl.textContent =
      name;
  }
  if (avatar) {
    avatar.textContent =
      String(name)
        .trim()
        .slice(0, 1)
        .toUpperCase() ||
      "U";
  }
  if (bioEl) {
    bioEl.textContent =
      p.bio ||
      "Kelola identitas dan kontenmu.";
  }
  /* =======================================================
     ADMIN
     ======================================================= */
  const admin =
    p.is_admin === true ||
    p.role === "admin";
  const adminBtn =
    $("adminBtn");
  if (adminBtn) {
    adminBtn.hidden =
      !admin;
  }
  /* =======================================================
     PROFILE DETAILS
     ======================================================= */
  const details =
    $("details");
  if (details) {
    const rows = [
      [
        "Username",
        p.username || "-"
      ],
      [
        "Username Telegram",
        p.telegram_username ||
          "Belum diisi"
      ],
      [
        "No. WhatsApp",
        p.whatsapp_number ||
          "Belum diisi"
      ],
      [
        "Gmail",
        p.auth_email ||
          "-"
      ],
      [
        "Website",
        p.website ||
          "Belum diisi"
      ],
      [
        "Role",
        p.role ||
          "user"
      ],
      [
        "Status",
        p.is_banned
          ? "Banned"
          : "Aktif"
      ],
      [
        "Bergabung",
        p.created_at
          ? new Date(
              p.created_at
            ).toLocaleDateString(
              "id-ID",
              {
                day: "2-digit",
                month: "long",
                year: "numeric"
              }
            )
          : "-"
      ]
    ];
    details.innerHTML =
      rows
        .map(([label, value]) => {
          const status =
            label === "Status";
          return `
            <div class="detail-row">
              <small>
                ${esc(label)}
              </small>
              <b
                ${
                  status
                    ? `class="${
                        p.is_banned
                          ? "profile-status-banned"
                          : "profile-status-active"
                      }"`
                    : ""
                }
              >
                ${esc(value)}
              </b>
            </div>
          `;
        })
        .join("");
  }
  /* =======================================================
     CONTENT COUNTS
     ======================================================= */
  const counts =
    $("counts");
  try {
    const [
      pastelinks,
      telegramProducts,
      telegramChannels,
      products
    ] = await Promise.all([
      sb
        .from("pastelinks")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "user_id",
          p.id
        ),
      sb
        .from("telegram_products")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "owner_id",
          p.id
        ),
      sb
        .from("telegram_channels")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "owner_id",
          p.id
        ),
      sb
        .from("products")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        )
        .eq(
          "creator_id",
          p.id
        )
    ]);
    const errors = [
      pastelinks.error,
      telegramProducts.error,
      telegramChannels.error,
      products.error
    ].filter(Boolean);
    if (errors.length) {
      throw errors[0];
    }
    if (counts) {
      const content = [
        [
          "fa-link",
          "Pastelink",
          pastelinks.count || 0
        ],
        [
          "fa-code",
          "Code",
          telegramProducts.count || 0
        ],
        [
          "fa-broadcast-tower",
          "Channel / Group",
          telegramChannels.count || 0
        ],
        [
          "fa-box",
          "Marketplace product",
          products.count || 0
        ]
      ];
      counts.innerHTML =
        content
          .map(
            ([icon, label, count]) => `
              <a
                class="content-count"
                href="my-products.html"
              >
                <span>
                  <i class="fa-solid ${icon}"></i>
                  ${esc(label)}
                </span>
                <b>
                  ${Number(count).toLocaleString("id-ID")}
                </b>
              </a>
            `
          )
          .join("");
    }
  } catch (error) {
    console.error(
      "Profile content count error:",
      error
    );
    if (counts) {
      counts.innerHTML = `
        <div class="profile-loading">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>
            Statistik konten tidak dapat dimuat.
          </span>
        </div>
      `;
    }
  }
  /* =======================================================
     PASSWORD
     ======================================================= */
  const passwordForm =
    $("profilePass");
  const passwordInput =
    $("profileNewPass");
  const passwordToggle =
    $("profilePassToggle");
  if (
    passwordForm &&
    passwordInput
  ) {
    passwordForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        const value =
          passwordInput.value;
        if (value.length < 6) {
          TC.toast(
            "Password minimal 6 karakter.",
            "error"
          );
          passwordInput.focus();
          return;
        }
        const submit =
          passwordForm.querySelector(
            'button[type="submit"]'
          );
        const original =
          submit?.innerHTML;
        try {
          if (submit) {
            submit.disabled = true;
            submit.innerHTML = `
              <i class="fa-solid fa-circle-notch fa-spin"></i>
              <span>Menyimpan...</span>
            `;
          }
          const result =
            await sb.auth.updateUser({
              password: value
            });
          if (result.error) {
            throw result.error;
          }
          TC.toast(
            "Password berhasil diubah.",
            "success"
          );
          passwordForm.reset();
          passwordInput.type =
            "password";
          if (passwordToggle) {
            passwordToggle.innerHTML = `
              <i class="fa-solid fa-eye"></i>
            `;
            passwordToggle.setAttribute(
              "aria-label",
              "Tampilkan password"
            );
          }
        } catch (error) {
          console.error(
            "Password update error:",
            error
          );
          TC.toast(
            error?.message ||
              "Password gagal diubah.",
            "error"
          );
        } finally {
          if (submit) {
            submit.disabled = false;
            submit.innerHTML =
              original ||
              `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Ubah password</span>
              `;
          }
        }
      }
    );
  }
  if (
    passwordToggle &&
    passwordInput
  ) {
    passwordToggle.addEventListener(
      "click",
      () => {
        const showing =
          passwordInput.type ===
          "text";
        passwordInput.type =
          showing
            ? "password"
            : "text";
        passwordToggle.innerHTML = `
          <i class="fa-solid ${
            showing
              ? "fa-eye"
              : "fa-eye-slash"
          }"></i>
        `;
        passwordToggle.setAttribute(
          "aria-label",
          showing
            ? "Tampilkan password"
            : "Sembunyikan password"
        );
      }
    );
  }
  /* =======================================================
     LOGIN INFORMATION
     ======================================================= */
  const currentLogin =
    $("currentLogin");
  const lastLogin =
    $("lastLogin");
  try {
    const result =
      await sb.rpc(
        "get_login_info"
      );
    if (result.error) {
      throw result.error;
    }
    const current =
      result.data?.current
        ?.logged_in_at;
    const last =
      result.data?.last
        ?.logged_in_at;
    if (currentLogin) {
      currentLogin.textContent =
        current
          ? new Date(
              current
            ).toLocaleString(
              "id-ID"
            )
          : "Belum tercatat";
    }
    if (lastLogin) {
      lastLogin.textContent =
        last
          ? new Date(
              last
            ).toLocaleString(
              "id-ID"
            )
          : "Belum ada";
    }
  } catch (error) {
    console.warn(
      "Login info unavailable:",
      error
    );
    if (currentLogin) {
      currentLogin.textContent =
        "Belum tercatat";
    }
    if (lastLogin) {
      lastLogin.textContent =
        "Belum ada";
    }
  }
});
