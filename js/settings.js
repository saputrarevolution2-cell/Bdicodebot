/* =========================================================
   PasTele — Settings
   Real Supabase logic preserved
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  /* =======================================================
     AUTH / PROFILE
     ======================================================= */
  const p = await TC.profile();
  if (!p) {
    location.replace('login.html');
    return;
  }
  const isAdmin =
    p.is_admin === true ||
    p.role === 'admin';
  const adminBtn = $('adminBtn');
  if (adminBtn) {
    adminBtn.hidden = !isAdmin;
  }
  $('username').value = p.username || '';
  $('telegram_username').value = p.telegram_username || '';
  $('whatsapp_number').value = p.whatsapp_number || '';
  $('bio').value = p.bio || '';
  $('email').textContent = p.auth_email || '-';
  /* =======================================================
     PAYMENT PROVIDERS
     Preserved from existing settings.js
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
  function fillProviders(selectedProvider = '') {
    const country = $('country').value;
    const list =
      providers[method]?.[country] ||
      providers[method]?.OTHER ||
      [];
    $('provider').innerHTML = list
      .map((name) => {
        const selected =
          selectedProvider &&
          selectedProvider === name
            ? ' selected'
            : '';
        return `
          <option value="${TC.esc(name)}"${selected}>
            ${TC.esc(name)}
          </option>
        `;
      })
      .join('');
    if (!list.length) {
      $('provider').innerHTML =
        '<option value="">Provider tidak tersedia</option>';
    }
  }
  fillProviders();
  /* =======================================================
     PAYMENT METHOD TABS
     ======================================================= */
  document.querySelectorAll('[data-method]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMethod = button.dataset.method;
      if (
        nextMethod !== 'ewallet' &&
        nextMethod !== 'bank'
      ) {
        return;
      }
      method = nextMethod;
      document.querySelectorAll('[data-method]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute(
          'aria-selected',
          active ? 'true' : 'false'
        );
      });
      fillProviders();
    });
  });
  /* =======================================================
     COUNTRY
     ======================================================= */
  $('country').addEventListener('change', () => {
    fillProviders();
  });
  /* =======================================================
     BUTTON LOADING
     ======================================================= */
  function setButtonLoading(button, loading, loadingText = 'Memproses...') {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.classList.add('is-loading');
      button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>${TC.esc(loadingText)}</span>
      `;
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
      }
    }
  }
  /* =======================================================
     PROFILE UPDATE
     ======================================================= */
  $('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('saveProfile');
    const username =
      $('username').value.trim();
    const telegramUsername =
      $('telegram_username').value.trim();
    const whatsappNumber =
      $('whatsapp_number').value.trim();
    const bio =
      $('bio').value.trim();
    if (!username) {
      TC.toast('Username wajib diisi.', 'error');
      $('username').focus();
      return;
    }
    setButtonLoading(
      button,
      true,
      'Menyimpan...'
    );
    try {
      const result = await sb
        .from('profiles')
        .update({
          username: username,
          display_name: username,
          telegram_username: telegramUsername || null,
          whatsapp_number: whatsappNumber || null,
          bio: bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', p.id);
      if (result.error) {
        TC.toast(
          result.error.message,
          'error'
        );
        return;
      }
      TC.toast(
        'Profil berhasil disimpan.',
        'success'
      );
    } catch (error) {
      TC.toast(
        error?.message || 'Gagal menyimpan profil.',
        'error'
      );
    } finally {
      setButtonLoading(button, false);
    }
  });
  /* =======================================================
     PASSWORD UPDATE
     ======================================================= */
  $('passForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('newpass');
    const button = $('changePassword');
    const password = input.value;
    if (!password) {
      TC.toast(
        'Masukkan password baru.',
        'error'
      );
      input.focus();
      return;
    }
    if (password.length < 6) {
      TC.toast(
        'Password minimal 6 karakter.',
        'error'
      );
      input.focus();
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
        TC.toast(
          result.error.message,
          'error'
        );
        return;
      }
      TC.toast(
        'Password berhasil diubah.',
        'success'
      );
      event.target.reset();
      document.querySelectorAll(
        '[data-toggle-pass]'
      ).forEach((toggle) => {
        const inputId =
          toggle.dataset.togglePass;
        const passwordInput =
          $(inputId);
        if (passwordInput) {
          passwordInput.type = 'password';
        }
        toggle.innerHTML =
          '<i class="fa-solid fa-eye"></i>';
      });
    } catch (error) {
      TC.toast(
        error?.message || 'Gagal mengubah password.',
        'error'
      );
    } finally {
      setButtonLoading(button, false);
    }
  });
  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */
  document
    .querySelectorAll('[data-toggle-pass]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const input =
          $(button.dataset.togglePass);
        if (!input) return;
        const visible =
          input.type === 'password';
        input.type =
          visible ? 'text' : 'password';
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
      });
    });
  /* =======================================================
     PAYMENT SAVE
     ======================================================= */
  $('payForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('savePayment');
    const provider =
      $('provider').value;
    const accountName =
      $('pname').value.trim();
    const accountNumber =
      $('pnumber').value.trim();
    const country =
      $('country').value;
    if (!provider) {
      TC.toast(
        'Pilih provider payment.',
        'error'
      );
      $('provider').focus();
      return;
    }
    if (!accountName) {
      TC.toast(
        'Nama pemegang rekening wajib diisi.',
        'error'
      );
      $('pname').focus();
      return;
    }
    if (!accountNumber) {
      TC.toast(
        'Nomor rekening / e-wallet wajib diisi.',
        'error'
      );
      $('pnumber').focus();
      return;
    }
    setButtonLoading(
      button,
      true,
      'Menyimpan...'
    );
    try {
      const result = await sb
        .from('payment_methods')
        .insert({
          user_id: p.id,
          method_type: method,
          provider: provider,
          account_name: accountName,
          account_number: accountNumber,
          country: country
        });
      if (result.error) {
        TC.toast(
          result.error.message,
          'error'
        );
        return;
      }
      TC.toast(
        'Payment berhasil disimpan.',
        'success'
      );
      event.target.reset();
      method = 'ewallet';
      document.querySelectorAll(
        '[data-method]'
      ).forEach((item) => {
        const active =
          item.dataset.method === method;
        item.classList.toggle(
          'active',
          active
        );
        item.setAttribute(
          'aria-selected',
          active ? 'true' : 'false'
        );
      });
      fillProviders();
      await loadPayments();
    } catch (error) {
      TC.toast(
        error?.message || 'Gagal menyimpan payment.',
        'error'
      );
    } finally {
      setButtonLoading(button, false);
    }
  });
  /* =======================================================
     PAYMENT LIST
     ======================================================= */
  async function loadPayments() {
    const container =
      $('savedPayments');
    const count =
      $('savedPaymentCount');
    container.innerHTML = `
      <div class="payment-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memuat payment...
      </div>
    `;
    try {
      const result = await sb
        .from('payment_methods')
        .select('*')
        .eq('user_id', p.id)
        .order('created_at', {
          ascending: false
        });
      if (result.error) {
        container.innerHTML = `
          <div class="payment-error">
            <i class="fa-solid fa-triangle-exclamation"></i>
            ${TC.esc(result.error.message)}
          </div>
        `;
        count.textContent = '0';
        return;
      }
      const payments =
        result.data || [];
      count.textContent =
        String(payments.length);
      if (!payments.length) {
        container.innerHTML = `
          <div class="payment-empty">
            <i class="fa-regular fa-credit-card"></i>
            <div style="margin-top:6px">
              Belum ada payment tersimpan.
            </div>
          </div>
        `;
        return;
      }
      container.innerHTML =
        payments.map((payment) => {
          const icon =
            payment.method_type === 'bank'
              ? 'fa-building-columns'
              : 'fa-wallet';
          const methodLabel =
            payment.method_type === 'bank'
              ? 'Bank'
              : 'E-Wallet';
          return `
            <div class="saved-payment">
              <div class="saved-payment-main">
                <div class="saved-payment-icon">
                  <i class="fa-solid ${icon}"></i>
                </div>
                <div class="saved-payment-text">
                  <b>
                    ${TC.esc(payment.provider || '-')}
                  </b>
                  <small>
                    ${TC.esc(methodLabel)}
                    ·
                    ${TC.esc(payment.account_name || '-')}
                    ·
                    ${TC.esc(payment.account_number || '-')}
                  </small>
                </div>
              </div>
              <button
                type="button"
                class="saved-payment-delete"
                data-del-pay="${TC.esc(String(payment.id))}"
                aria-label="Hapus payment"
                title="Hapus payment"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `;
        }).join('');
      bindDeleteButtons();
    } catch (error) {
      count.textContent = '0';
      container.innerHTML = `
        <div class="payment-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          ${TC.esc(
            error?.message ||
            'Gagal memuat payment.'
          )}
        </div>
      `;
    }
  }
  /* =======================================================
     DELETE PAYMENT
     ======================================================= */
  function bindDeleteButtons() {
    document
      .querySelectorAll('[data-del-pay]')
      .forEach((button) => {
        button.addEventListener('click', async () => {
          const id =
            button.dataset.delPay;
          if (!id) return;
          const confirmed =
            window.confirm(
              'Hapus payment ini dari akunmu?'
            );
          if (!confirmed) return;
          button.disabled = true;
          try {
            const result = await sb
              .from('payment_methods')
              .delete()
              .eq('id', id)
              .eq('user_id', p.id);
            if (result.error) {
              TC.toast(
                result.error.message,
                'error'
              );
              button.disabled = false;
              return;
            }
            TC.toast(
              'Payment berhasil dihapus.',
              'success'
            );
            await loadPayments();
          } catch (error) {
            TC.toast(
              error?.message ||
              'Gagal menghapus payment.',
              'error'
            );
            button.disabled = false;
          }
        });
      });
  }
  /* =======================================================
     LOGOUT
     ======================================================= */
  $('logout').addEventListener('click', async () => {
    const button = $('logout');
    const confirmed =
      window.confirm(
        'Yakin ingin logout dari akun ini?'
      );
    if (!confirmed) return;
    button.disabled = true;
    try {
      await Auth.logout();
    } catch (error) {
      button.disabled = false;
      TC.toast(
        error?.message ||
        'Gagal logout.',
        'error'
      );
    }
  });
  /* =======================================================
     INITIAL LOAD
     ======================================================= */
  await loadPayments();
});
