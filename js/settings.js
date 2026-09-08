/* =========================================================
   PasTele — Settings
   FINAL PREMIUM SETTINGS
   Supabase + Profile + Payment + Security + Appearance
   Notifications + Account + Logout Modal
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  /* =======================================================
     SAFE HELPERS
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const getTC = () => window.TC || null;
  const getSB = () => window.sb || window.supabaseClient || null;

  const TC = getTC();
  const sb = getSB();

  if (!TC || !sb) {
    console.error('[Settings] TC / Supabase client belum tersedia.');

    const toast = $('toast');

    if (toast) {
      toast.textContent = 'Konfigurasi aplikasi belum siap.';
      toast.classList.add('show', 'error');

      setTimeout(() => {
        toast.classList.remove('show', 'error');
      }, 3500);
    }

    return;
  }

  const escapeHTML = (value) => {
    if (typeof TC.esc === 'function') {
      return TC.esc(String(value ?? ''));
    }

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const toast = (message, type = 'info') => {
    if (typeof TC.toast === 'function') {
      TC.toast(message, type);
      return;
    }

    const box = $('toast');

    if (!box) return;

    box.textContent = String(message || '');
    box.className = '';
    box.classList.add('show', type);

    window.clearTimeout(toast.timer);

    toast.timer = window.setTimeout(() => {
      box.classList.remove('show', type);
    }, 3500);
  };

  /* =======================================================
     DOM
     ======================================================= */

  const profileForm = $('profileForm');
  const passForm = $('passForm');
  const payForm = $('payForm');

  const usernameInput = $('username');
  const telegramInput = $('telegram_username');
  const whatsappInput = $('whatsapp_number');
  const bioInput = $('bio');

  const emailBox = $('email');
  const adminBtn = $('adminBtn');

  const newPasswordInput = $('newpass');
  const passwordStrength = $('passwordStrength');

  const countrySelect = $('country');
  const providerSelect = $('provider');
  const pnameInput = $('pname');
  const pnumberInput = $('pnumber');

  const savedPaymentCount = $('savedPaymentCount');
  const savedPayments = $('savedPayments');

  const accountStatus = $('accountStatus');
  const accountRole = $('accountRole');
  const premiumStatus = $('premiumStatus');

  const sessionStatus = $('sessionStatus');
  const lastLogin = $('lastLogin');

  const logoutButton = $('logout');

  /* =======================================================
     AUTH / PROFILE
     ======================================================= */

  let profile = null;

  try {
    if (typeof TC.profile === 'function') {
      profile = await TC.profile();
    }
  } catch (error) {
    console.warn('[Settings] TC.profile failed:', error);
  }

  if (!profile) {
    try {
      const {
        data,
        error
      } = await sb.auth.getUser();

      if (!error && data?.user) {
        const user = data.user;

        const {
          data: profileData
        } = await sb
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        profile = profileData || {
          id: user.id,
          auth_email: user.email
        };
      }
    } catch (error) {
      console.warn('[Settings] Auth fallback failed:', error);
    }
  }

  if (!profile) {
    location.replace('login.html');
    return;
  }

  const profileId = profile.id;

  if (!profileId) {
    toast('Data akun tidak valid.', 'error');
    return;
  }

  /* =======================================================
     ACCOUNT STATE
     ======================================================= */

  const isAdmin =
    profile.is_admin === true ||
    profile.role === 'admin' ||
    profile.role === 'owner';

  const isPremium =
    profile.is_premium === true ||
    profile.premium === true ||
    profile.subscription_until &&
    new Date(profile.subscription_until).getTime() > Date.now();

  if (adminBtn) {
    adminBtn.hidden = !isAdmin;
  }

  if (usernameInput) {
    usernameInput.value = profile.username || '';
  }

  if (telegramInput) {
    telegramInput.value = profile.telegram_username || '';
  }

  if (whatsappInput) {
    whatsappInput.value = profile.whatsapp_number || '';
  }

  if (bioInput) {
    bioInput.value = profile.bio || '';
  }

  if (emailBox) {
    emailBox.textContent =
      profile.auth_email ||
      profile.email ||
      '-';
  }

  if (accountStatus) {
    accountStatus.textContent =
      profile.status === 'banned'
        ? 'Banned'
        : profile.status === 'suspended'
          ? 'Suspended'
          : 'Active';
  }

  if (accountRole) {
    accountRole.textContent =
      isAdmin
        ? 'Administrator'
        : 'Creator / User';
  }

  if (premiumStatus) {
    premiumStatus.textContent =
      isPremium
        ? 'Premium'
        : 'Free';
  }

  /* =======================================================
     LAST LOGIN / SESSION
     ======================================================= */

  async function loadSessionInfo() {
    try {
      const {
        data,
        error
      } = await sb.auth.getSession();

      if (error) throw error;

      const session = data?.session;

      if (sessionStatus) {
        sessionStatus.textContent =
          session
            ? 'Session aktif'
            : 'Tidak aktif';
      }

      if (lastLogin) {
        const raw =
          profile.last_login_at ||
          profile.last_sign_in_at ||
          session?.user?.last_sign_in_at;

        if (raw) {
          lastLogin.textContent =
            formatDateTime(raw);
        } else {
          lastLogin.textContent =
            'Tidak tersedia';
        }
      }
    } catch (error) {
      console.warn(
        '[Settings] Session info failed:',
        error
      );

      if (sessionStatus) {
        sessionStatus.textContent =
          'Tidak diketahui';
      }
    }
  }

  function formatDateTime(value) {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(date);
  }

  await loadSessionInfo();

  /* =======================================================
     BUTTON LOADING
     ======================================================= */

  function setButtonLoading(
    button,
    loading,
    loadingText = 'Memproses...'
  ) {
    if (!button) return;

    if (loading) {
      if (!button.dataset.originalHtml) {
        button.dataset.originalHtml =
          button.innerHTML;
      }

      button.disabled = true;
      button.classList.add('is-loading');

      button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>${escapeHTML(loadingText)}</span>
      `;
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');

      if (button.dataset.originalHtml) {
        button.innerHTML =
          button.dataset.originalHtml;

        delete button.dataset.originalHtml;
      }
    }
  }

  /* =======================================================
     PAYMENT PROVIDERS
     ======================================================= */

  const providers = {
    ewallet: {
      ID: [
        'DANA',
        'OVO',
        'GoPay',
        'ShopeePay',
        'LinkAja',
        'iSaku',
        'Sakuku',
        'Jenius Pay',
        'QRIS'
      ],

      US: [
        'PayPal',
        'Venmo',
        'Cash App',
        'Apple Pay',
        'Google Pay'
      ],

      GB: [
        'PayPal',
        'Revolut',
        'Wise'
      ],

      SG: [
        'PayNow',
        'GrabPay',
        'PayPal'
      ],

      MY: [
        'Touch n Go eWallet',
        'GrabPay',
        'Boost',
        'PayPal'
      ],

      PH: [
        'GCash',
        'Maya',
        'GrabPay'
      ],

      TH: [
        'TrueMoney',
        'Rabbit LINE Pay'
      ],

      AU: [
        'PayPal',
        'Apple Pay',
        'Google Pay'
      ],

      JP: [
        'PayPay',
        'LINE Pay',
        'Rakuten Pay'
      ],

      OTHER: [
        'PayPal',
        'Wise',
        'Revolut'
      ]
    },

    bank: {
      ID: [
        'BCA',
        'BRI',
        'BNI',
        'Mandiri',
        'BSI',
        'CIMB Niaga',
        'Danamon',
        'Permata',
        'BTN',
        'Bank Jago',
        'SeaBank',
        'Bank Neo Commerce',
        'Maybank Indonesia'
      ],

      US: [
        'JPMorgan Chase',
        'Bank of America',
        'Wells Fargo',
        'Citibank',
        'U.S. Bank',
        'Capital One'
      ],

      GB: [
        'HSBC UK',
        'Barclays',
        'Lloyds Bank',
        'NatWest',
        'Santander UK'
      ],

      SG: [
        'DBS',
        'OCBC',
        'UOB',
        'Standard Chartered Singapore'
      ],

      MY: [
        'Maybank',
        'CIMB Malaysia',
        'Public Bank',
        'RHB',
        'Hong Leong Bank'
      ],

      PH: [
        'BDO',
        'BPI',
        'Metrobank',
        'UnionBank',
        'Security Bank'
      ],

      TH: [
        'Bangkok Bank',
        'Kasikornbank',
        'Krungthai',
        'Siam Commercial Bank'
      ],

      AU: [
        'Commonwealth Bank',
        'ANZ',
        'Westpac',
        'NAB'
      ],

      JP: [
        'MUFG',
        'SMBC',
        'Mizuho',
        'Japan Post Bank'
      ],

      OTHER: [
        'SWIFT / International Bank'
      ]
    }
  };

  let method = 'ewallet';

  /* =======================================================
     PROVIDER SELECT
     ======================================================= */

  function fillProviders(
    selectedProvider = ''
  ) {
    if (!providerSelect || !countrySelect) {
      return;
    }

    const country =
      countrySelect.value || 'ID';

    const list =
      providers[method]?.[country] ||
      providers[method]?.OTHER ||
      [];

    providerSelect.innerHTML = list
      .map((name) => {
        const selected =
          selectedProvider &&
          selectedProvider === name
            ? ' selected'
            : '';

        return `
          <option
            value="${escapeHTML(name)}"
            ${selected}
          >
            ${escapeHTML(name)}
          </option>
        `;
      })
      .join('');

    if (!list.length) {
      providerSelect.innerHTML =
        '<option value="">Provider tidak tersedia</option>';
    }
  }

  fillProviders();

  /* =======================================================
     PAYMENT METHOD TABS
     ======================================================= */

  document
    .querySelectorAll('[data-method]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const nextMethod =
          button.dataset.method;

        if (
          nextMethod !== 'ewallet' &&
          nextMethod !== 'bank'
        ) {
          return;
        }

        method = nextMethod;

        document
          .querySelectorAll('[data-method]')
          .forEach((item) => {
            const active =
              item.dataset.method === method;

            item.classList.toggle(
              'active',
              active
            );

            item.setAttribute(
              'aria-selected',
              active
                ? 'true'
                : 'false'
            );
          });

        fillProviders();
      });
    });

  /* =======================================================
     COUNTRY
     ======================================================= */

  if (countrySelect) {
    countrySelect.addEventListener(
      'change',
      () => {
        fillProviders();
      }
    );
  }

  /* =======================================================
     PROFILE UPDATE
     ======================================================= */

  if (profileForm) {
    profileForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const button =
          $('saveProfile');

        const username =
          usernameInput?.value
            .trim() || '';

        const telegramUsername =
          telegramInput?.value
            .trim() || '';

        const whatsappNumber =
          whatsappInput?.value
            .trim() || '';

        const bio =
          bioInput?.value
            .trim() || '';

        if (!username) {
          toast(
            'Username wajib diisi.',
            'error'
          );

          usernameInput?.focus();
          return;
        }

        if (username.length < 3) {
          toast(
            'Username minimal 3 karakter.',
            'error'
          );

          usernameInput?.focus();
          return;
        }

        setButtonLoading(
          button,
          true,
          'Menyimpan...'
        );

        try {
          const result =
            await sb
              .from('profiles')
              .update({
                username,
                display_name: username,
                telegram_username:
                  telegramUsername || null,
                whatsapp_number:
                  whatsappNumber || null,
                bio:
                  bio || null,
                updated_at:
                  new Date().toISOString()
              })
              .eq('id', profileId);

          if (result.error) {
            throw result.error;
          }

          Object.assign(
            profile,
            {
              username,
              display_name: username,
              telegram_username:
                telegramUsername || null,
              whatsapp_number:
                whatsappNumber || null,
              bio:
                bio || null
            }
          );

          toast(
            'Profil berhasil disimpan.',
            'success'
          );
        } catch (error) {
          console.error(
            '[Settings] Profile update:',
            error
          );

          toast(
            error?.message ||
            'Gagal menyimpan profil.',
            'error'
          );
        } finally {
          setButtonLoading(
            button,
            false
          );
        }
      }
    );
  }

  /* =======================================================
     PASSWORD STRENGTH
     ======================================================= */

  function calculatePasswordStrength(
    password
  ) {
    if (!password) {
      return {
        score: 0,
        label: 'Belum diisi',
        level: ''
      };
    }

    let score = 0;

    if (password.length >= 6) {
      score++;
    }

    if (password.length >= 10) {
      score++;
    }

    if (/[a-z]/.test(password)) {
      score++;
    }

    if (/[A-Z]/.test(password)) {
      score++;
    }

    if (/\d/.test(password)) {
      score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    }

    if (score <= 2) {
      return {
        score,
        label: 'Lemah',
        level: 'weak'
      };
    }

    if (score <= 4) {
      return {
        score,
        label: 'Sedang',
        level: 'medium'
      };
    }

    if (score === 5) {
      return {
        score,
        label: 'Kuat',
        level: 'strong'
      };
    }

    return {
      score,
      label: 'Sangat kuat',
      level: 'excellent'
    };
  }

  function renderPasswordStrength() {
    if (!passwordStrength) {
      return;
    }

    const password =
      newPasswordInput?.value || '';

    const result =
      calculatePasswordStrength(password);

    passwordStrength.dataset.strength =
      result.level;

    const text =
      passwordStrength.querySelector(
        '.password-strength-text'
      );

    if (text) {
      text.textContent =
        result.label;
    }
  }

  if (newPasswordInput) {
    newPasswordInput.addEventListener(
      'input',
      renderPasswordStrength
    );

    renderPasswordStrength();
  }

  /* =======================================================
     PASSWORD UPDATE
     ======================================================= */

  if (passForm) {
    passForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const input =
          newPasswordInput;

        const button =
          $('changePassword');

        const password =
          input?.value || '';

        if (!password) {
          toast(
            'Masukkan password baru.',
            'error'
          );

          input?.focus();
          return;
        }

        if (password.length < 6) {
          toast(
            'Password minimal 6 karakter.',
            'error'
          );

          input?.focus();
          return;
        }

        setButtonLoading(
          button,
          true,
          'Mengubah...'
        );

        try {
          const result =
            await sb.auth.updateUser({
              password
            });

          if (result.error) {
            throw result.error;
          }

          toast(
            'Password berhasil diubah.',
            'success'
          );

          event.target.reset();

          if (passwordStrength) {
            passwordStrength.dataset.strength =
              '';

            const text =
              passwordStrength.querySelector(
                '.password-strength-text'
              );

            if (text) {
              text.textContent =
                'Belum diisi';
            }
          }

          document
            .querySelectorAll(
              '[data-toggle-pass]'
            )
            .forEach((toggle) => {
              const inputId =
                toggle.dataset.togglePass;

              const passwordInput =
                $(inputId);

              if (passwordInput) {
                passwordInput.type =
                  'password';
              }

              toggle.innerHTML =
                '<i class="fa-solid fa-eye"></i>';

              toggle.setAttribute(
                'aria-label',
                'Tampilkan password'
              );
            });
        } catch (error) {
          console.error(
            '[Settings] Password update:',
            error
          );

          toast(
            error?.message ||
            'Gagal mengubah password.',
            'error'
          );
        } finally {
          setButtonLoading(
            button,
            false
          );
        }
      }
    );
  }

  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */

  document
    .querySelectorAll(
      '[data-toggle-pass]'
    )
    .forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const input =
            $(button.dataset.togglePass);

          if (!input) return;

          const visible =
            input.type === 'password';

          input.type =
            visible
              ? 'text'
              : 'password';

          button.innerHTML = `
            <i class="fa-solid ${
              visible
                ? 'fa-eye-slash'
                : 'fa-eye'
            }"></i>
          `;

          button.setAttribute(
            'aria-label',
            visible
              ? 'Sembunyikan password'
              : 'Tampilkan password'
          );

          button.setAttribute(
            'title',
            visible
              ? 'Sembunyikan password'
              : 'Tampilkan password'
          );
        }
      );
    });

  /* =======================================================
     PAYMENT SAVE
     ======================================================= */

  if (payForm) {
    payForm.addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        const button =
          $('savePayment');

        const provider =
          providerSelect?.value || '';

        const accountName =
          pnameInput?.value
            .trim() || '';

        const accountNumber =
          pnumberInput?.value
            .trim() || '';

        const country =
          countrySelect?.value || 'ID';

        if (!provider) {
          toast(
            'Pilih provider payment.',
            'error'
          );

          providerSelect?.focus();
          return;
        }

        if (!accountName) {
          toast(
            'Nama pemegang rekening wajib diisi.',
            'error'
          );

          pnameInput?.focus();
          return;
        }

        if (!accountNumber) {
          toast(
            'Nomor rekening / e-wallet wajib diisi.',
            'error'
          );

          pnumberInput?.focus();
          return;
        }

        if (
          accountNumber.length < 4
        ) {
          toast(
            'Nomor rekening / e-wallet tidak valid.',
            'error'
          );

          pnumberInput?.focus();
          return;
        }

        setButtonLoading(
          button,
          true,
          'Menyimpan...'
        );

        try {
          const result =
            await sb
              .from('payment_methods')
              .insert({
                user_id: profileId,
                method_type: method,
                provider,
                account_name:
                  accountName,
                account_number:
                  accountNumber,
                country
              });

          if (result.error) {
            throw result.error;
          }

          toast(
            'Payment berhasil disimpan.',
            'success'
          );

          payForm.reset();

          method = 'ewallet';

          document
            .querySelectorAll(
              '[data-method]'
            )
            .forEach((item) => {
              const active =
                item.dataset.method ===
                method;

              item.classList.toggle(
                'active',
                active
              );

              item.setAttribute(
                'aria-selected',
                active
                  ? 'true'
                  : 'false'
              );
            });

          fillProviders();

          await loadPayments();
        } catch (error) {
          console.error(
            '[Settings] Payment save:',
            error
          );

          toast(
            error?.message ||
            'Gagal menyimpan payment.',
            'error'
          );
        } finally {
          setButtonLoading(
            button,
            false
          );
        }
      }
    );
  }

  /* =======================================================
     PAYMENT LIST
     ======================================================= */

  async function loadPayments() {
    if (!savedPayments) {
      return;
    }

    savedPayments.innerHTML = `
      <div class="payment-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memuat payment...
      </div>
    `;

    try {
      const result =
        await sb
          .from('payment_methods')
          .select('*')
          .eq('user_id', profileId)
          .order(
            'created_at',
            {
              ascending: false
            }
          );

      if (result.error) {
        throw result.error;
      }

      const payments =
        result.data || [];

      if (savedPaymentCount) {
        savedPaymentCount.textContent =
          String(payments.length);
      }

      if (!payments.length) {
        savedPayments.innerHTML = `
          <div class="payment-empty">
            <i class="fa-regular fa-credit-card"></i>

            <div style="margin-top:6px">
              Belum ada payment tersimpan.
            </div>
          </div>
        `;

        return;
      }

      savedPayments.innerHTML =
        payments
          .map((payment) => {
            const isBank =
              payment.method_type ===
              'bank';

            const icon =
              isBank
                ? 'fa-building-columns'
                : 'fa-wallet';

            const methodLabel =
              isBank
                ? 'Bank'
                : 'E-Wallet';

            const masked =
              maskPaymentNumber(
                payment.account_number
              );

            return `
              <div class="saved-payment">

                <div class="saved-payment-main">

                  <div class="saved-payment-icon">
                    <i class="fa-solid ${icon}"></i>
                  </div>

                  <div class="saved-payment-text">

                    <b>
                      ${escapeHTML(
                        payment.provider || '-'
                      )}
                    </b>

                    <small>
                      ${escapeHTML(
                        methodLabel
                      )}
                      ·
                      ${escapeHTML(
                        payment.account_name || '-'
                      )}
                      ·
                      ${escapeHTML(
                        masked
                      )}
                    </small>

                  </div>

                </div>

                <button
                  type="button"
                  class="saved-payment-delete"
                  data-del-pay="${escapeHTML(
                    String(payment.id)
                  )}"
                  aria-label="Hapus payment"
                  title="Hapus payment"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>

              </div>
            `;
          })
          .join('');

      bindDeleteButtons();
    } catch (error) {
      console.error(
        '[Settings] Load payments:',
        error
      );

      if (savedPaymentCount) {
        savedPaymentCount.textContent =
          '0';
      }

      savedPayments.innerHTML = `
        <div class="payment-error">
          <i class="fa-solid fa-triangle-exclamation"></i>

          ${escapeHTML(
            error?.message ||
            'Gagal memuat payment.'
          )}
        </div>
      `;
    }
  }

  function maskPaymentNumber(
    value
  ) {
    const raw =
      String(value || '').trim();

    if (!raw) {
      return '-';
    }

    if (raw.length <= 4) {
      return raw;
    }

    return '•••• ' +
      raw.slice(-4);
  }

  /* =======================================================
     DELETE PAYMENT
     ======================================================= */

  function bindDeleteButtons() {
    document
      .querySelectorAll(
        '[data-del-pay]'
      )
      .forEach((button) => {
        button.addEventListener(
          'click',
          async () => {
            const id =
              button.dataset.delPay;

            if (!id) return;

            const confirmed =
              window.confirm(
                'Hapus payment ini dari akunmu?'
              );

            if (!confirmed) {
              return;
            }

            button.disabled = true;

            try {
              const result =
                await sb
                  .from('payment_methods')
                  .delete()
                  .eq('id', id)
                  .eq(
                    'user_id',
                    profileId
                  );

              if (result.error) {
                throw result.error;
              }

              toast(
                'Payment berhasil dihapus.',
                'success'
              );

              await loadPayments();
            } catch (error) {
              console.error(
                '[Settings] Delete payment:',
                error
              );

              toast(
                error?.message ||
                'Gagal menghapus payment.',
                'error'
              );

              button.disabled = false;
            }
          }
        );
      });
  }

  /* =======================================================
     THEME / APPEARANCE
     ======================================================= */

  /* =======================================================
     THEME / APPEARANCE — AUTOMATIC DAY/NIGHT
     ======================================================= */

  function getAutoTheme() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }

  function applyAutoTheme() {
    const theme = getAutoTheme();

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.classList.toggle('theme-light', theme === 'light');

    if (document.body) {
      document.body.classList.toggle('theme-dark', theme === 'dark');
      document.body.classList.toggle('theme-light', theme === 'light');
    }

    // The settings page always shows the automatic mode as active.
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const active = button.dataset.themeOption === 'system';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // Remove any old manual preference from previous versions.
  try { localStorage.removeItem('pastele-theme'); } catch (_) {}

  applyAutoTheme();

  // Switch an already-open settings page exactly at the next day/night boundary.
  window.setInterval(applyAutoTheme, 60 * 1000);

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      applyAutoTheme();
      toast('Tema otomatis mengikuti waktu: 06.00–17.59 terang, 18.00–05.59 gelap.', 'success');
    });
  });

  /* =======================================================
     NOTIFICATION SETTINGS
     ======================================================= */

  const NOTIFY_KEY =
    'pastele-notification-settings';

  const defaultNotifications = {
    wallet: true,
    sales: true,
    followers: true,
    announcements: true
  };

  function getNotifications() {
    try {
      const stored =
        JSON.parse(
          localStorage.getItem(
            NOTIFY_KEY
          ) || '{}'
        );

      return {
        ...defaultNotifications,
        ...stored
      };
    } catch {
      return {
        ...defaultNotifications
      };
    }
  }

  function saveNotifications(
    settings
  ) {
    localStorage.setItem(
      NOTIFY_KEY,
      JSON.stringify(settings)
    );
  }

  function applyNotifications() {
    const settings =
      getNotifications();

    const map = {
      notifyWallet:
        settings.wallet,

      notifySales:
        settings.sales,

      notifyFollowers:
        settings.followers,

      notifyAnnouncements:
        settings.announcements
    };

    Object.entries(map)
      .forEach(
        ([id, enabled]) => {
          const button =
            $(id);

          if (!button) {
            return;
          }

          button.classList.toggle(
            'active',
            enabled
          );

          button.setAttribute(
            'aria-checked',
            enabled
              ? 'true'
              : 'false'
          );

          button.setAttribute(
            'aria-pressed',
            enabled
              ? 'true'
              : 'false'
          );
        }
      );
  }

  applyNotifications();

  const notificationMap = {
    notifyWallet: 'wallet',
    notifySales: 'sales',
    notifyFollowers: 'followers',
    notifyAnnouncements:
      'announcements'
  };

  Object.entries(
    notificationMap
  ).forEach(
    ([id, key]) => {
      const button = $(id);

      if (!button) {
        return;
      }

      button.addEventListener(
        'click',
        () => {
          const settings =
            getNotifications();

          settings[key] =
            !settings[key];

          saveNotifications(
            settings
          );

          applyNotifications();
        }
      );
    }
  );

  /* =======================================================
     QUICK NAVIGATION
     ======================================================= */

  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach((link) => {
      link.addEventListener(
        'click',
        (event) => {
          const targetId =
            link.getAttribute('href');

          if (
            !targetId ||
            targetId === '#'
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
            behavior:
              window.matchMedia(
                '(prefers-reduced-motion: reduce)'
              ).matches
                ? 'auto'
                : 'smooth',

            block: 'start'
          });

          history.replaceState(
            null,
            '',
            targetId
          );
        }
      );
    });

  /* =======================================================
     LOGOUT MODAL
     ======================================================= */

  const logoutModal =
    $('logoutModal');

  const logoutCancel =
    $('logoutCancel');

  const logoutConfirm =
    $('logoutConfirm');

  let previousFocus =
    null;

  function openLogoutModal() {
    if (!logoutModal) {
      return false;
    }

    previousFocus =
      document.activeElement;

    logoutModal.hidden = false;

    logoutModal.setAttribute(
      'aria-hidden',
      'false'
    );

    logoutModal.classList.add(
      'is-open'
    );

    document.body.classList.add(
      'modal-open'
    );

    window.setTimeout(() => {
      logoutCancel?.focus();
    }, 30);

    return true;
  }

  function closeLogoutModal() {
    if (!logoutModal) {
      return;
    }

    logoutModal.classList.remove(
      'is-open'
    );

    logoutModal.setAttribute(
      'aria-hidden',
      'true'
    );

    logoutModal.hidden = true;

    document.body.classList.remove(
      'modal-open'
    );

    if (
      previousFocus &&
      typeof previousFocus.focus ===
      'function'
    ) {
      previousFocus.focus();
    }

    previousFocus = null;
  }

  if (logoutButton) {
    logoutButton.addEventListener(
      'click',
      () => {
        if (
          !openLogoutModal()
        ) {
          performLogout();
        }
      }
    );
  }

  logoutCancel?.addEventListener(
    'click',
    closeLogoutModal
  );

  document
    .querySelectorAll(
      '[data-close-logout]'
    )
    .forEach((element) => {
      element.addEventListener(
        'click',
        closeLogoutModal
      );
    });

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key === 'Escape' &&
        logoutModal &&
        !logoutModal.hidden
      ) {
        closeLogoutModal();
      }
    }
  );

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function performLogout() {
    const button =
      logoutConfirm ||
      logoutButton;

    setButtonLoading(
      button,
      true,
      'Logout...'
    );

    try {
      if (
        window.Auth &&
        typeof window.Auth.logout ===
        'function'
      ) {
        await window.Auth.logout();
        return;
      }

      const result =
        await sb.auth.signOut();

      if (result.error) {
        throw result.error;
      }

      location.replace(
        'login.html'
      );
    } catch (error) {
      console.error(
        '[Settings] Logout:',
        error
      );

      setButtonLoading(
        button,
        false
      );

      toast(
        error?.message ||
        'Gagal logout.',
        'error'
      );
    }
  }

  logoutConfirm?.addEventListener(
    'click',
    async () => {
      closeLogoutModal();
      await performLogout();
    }
  );

  /* =======================================================
     REFRESH PROFILE
     ======================================================= */

  const refreshButton =
    $('refreshSettings') ||
    $('refreshProfile');

  refreshButton?.addEventListener(
    'click',
    async () => {
      setButtonLoading(
        refreshButton,
        true,
        'Memuat...'
      );

      try {
        const {
          data,
          error
        } = await sb
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          profile = {
            ...profile,
            ...data
          };

          if (usernameInput) {
            usernameInput.value =
              profile.username || '';
          }

          if (telegramInput) {
            telegramInput.value =
              profile.telegram_username ||
              '';
          }

          if (whatsappInput) {
            whatsappInput.value =
              profile.whatsapp_number ||
              '';
          }

          if (bioInput) {
            bioInput.value =
              profile.bio || '';
          }
        }

        await loadPayments();
        await loadSessionInfo();

        toast(
          'Pengaturan berhasil diperbarui.',
          'success'
        );
      } catch (error) {
        console.error(
          '[Settings] Refresh:',
          error
        );

        toast(
          error?.message ||
          'Gagal memperbarui pengaturan.',
          'error'
        );
      } finally {
        setButtonLoading(
          refreshButton,
          false
        );
      }
    }
  );

  /* =======================================================
     PREMIUM / ACCOUNT STATUS
     ======================================================= */

  if (
    profile.subscription_until &&
    premiumStatus
  ) {
    const until =
      new Date(
        profile.subscription_until
      );

    if (
      !Number.isNaN(
        until.getTime()
      )
    ) {
      premiumStatus.title =
        `Aktif sampai ${formatDateTime(
          until
        )}`;
    }
  }

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  await loadPayments();

  /* =======================================================
     CLEAN UP MODAL STATE ON PAGE HIDE
     ======================================================= */

  window.addEventListener(
    'pagehide',
    () => {
      document.body.classList.remove(
        'modal-open'
      );
    }
  );
});
