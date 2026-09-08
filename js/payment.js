document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =========================================================
     PasTele — PAYMENT
     BAYAR.GG QRIS
     Seller 70% / Platform 30%
     ========================================================= */

  const $ = (id) => document.getElementById(id);

  const qs = new URLSearchParams(location.search);
  const orderId = String(qs.get("order_id") || "").trim();

  const money = (value) => {
    const n = Number(value || 0);

    if (window.TC?.money) {
      return window.TC.money(n);
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(n);
  };

  const esc = (value) => {
    if (window.TC?.esc) {
      return window.TC.esc(value);
    }

    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]
    );
  };

  /* =========================================================
     DOM
     ========================================================= */

  const loading = $("paymentLoading");
  const content = $("paymentContent");
  const errorBox = $("paymentError");

  const qr = $("qrWrap");
  const urlBtn = $("cashUrl");
  const checkBtn = $("checkPayment");

  const statusPill = $("paymentStatusPill");
  const statusTitle = $("paymentStatusTitle");
  const statusText = $("paymentStatusText");
  const statusIcon = $("statusIcon");

  let timer = null;
  let creating = false;
  let finishing = false;
  let qrLibraryPromise = null;

  /* =========================================================
     ERROR
     ========================================================= */

  const fail = (message) => {
    clearInterval(timer);

    if (loading) {
      loading.hidden = true;
    }

    if (content) {
      content.hidden = true;
    }

    if (errorBox) {
      errorBox.hidden = false;

      errorBox.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>${esc(message)}</span>
      `;
    }
  };

  /* =========================================================
     SUPABASE CHECK
     ========================================================= */

  const requireSupabase = () => {
    if (!window.sb) {
      throw new Error(
        "Supabase belum siap. Periksa koneksi Supabase dan js/config.js."
      );
    }
  };

  /* =========================================================
     LOAD ORDER
     ========================================================= */

  const loadOrder = async () => {
    requireSupabase();

    const result = await window.sb
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (result.error) {
      throw new Error(
        result.error.message ||
        "Gagal mengambil data order."
      );
    }

    if (!result.data) {
      throw new Error(
        "Order tidak ditemukan atau tidak dapat diakses."
      );
    }

    return result.data;
  };

  /* =========================================================
     STATUS
     ========================================================= */

  const renderStatus = (status) => {
    const normalized = String(status || "pending")
      .trim()
      .toLowerCase();

    if (statusPill) {
      statusPill.textContent = normalized.toUpperCase();
    }

    /* -------------------------------------------------------
       PAID
       ------------------------------------------------------- */

    if (
      [
        "paid",
        "success",
        "completed",
        "settled"
      ].includes(normalized)
    ) {
      if (statusIcon) {
        statusIcon.innerHTML =
          '<i class="fa-solid fa-circle-check"></i>';
      }

      if (statusTitle) {
        statusTitle.textContent =
          "Pembayaran berhasil";
      }

      if (statusText) {
        statusText.textContent =
          "Pembayaran sudah diverifikasi. Membuka halaman sukses...";
      }

      clearInterval(timer);

      if (!finishing) {
        finishing = true;

        setTimeout(() => {
          location.href =
            `payment-success.html?order_id=${encodeURIComponent(orderId)}`;
        }, 700);
      }

      return true;
    }

    /* -------------------------------------------------------
       FAILED
       ------------------------------------------------------- */

    if (
      [
        "failed",
        "cancelled",
        "canceled",
        "expired"
      ].includes(normalized)
    ) {
      if (statusIcon) {
        statusIcon.innerHTML =
          '<i class="fa-solid fa-circle-xmark"></i>';
      }

      if (statusTitle) {
        statusTitle.textContent =
          "Pembayaran tidak berhasil";
      }

      if (statusText) {
        statusText.textContent =
          "Order ini tidak lagi dapat dibayar. Silakan buat transaksi baru.";
      }

      clearInterval(timer);

      return false;
    }

    /* -------------------------------------------------------
       PENDING
       ------------------------------------------------------- */

    if (statusIcon) {
      statusIcon.innerHTML =
        '<i class="fa-solid fa-clock"></i>';
    }

    if (statusTitle) {
      statusTitle.textContent =
        "Menunggu pembayaran";
    }

    if (statusText) {
      statusText.textContent =
        "Scan QRIS Bayar.gg. Setelah pembayaran selesai, status akan diverifikasi otomatis.";
    }

    return false;
  };

  /* =========================================================
     LOAD QR CODE LIBRARY
     ========================================================= */

  const loadQRCodeLibrary = () => {
    if (window.QRCode) {
      return Promise.resolve(window.QRCode);
    }

    if (qrLibraryPromise) {
      return qrLibraryPromise;
    }

    qrLibraryPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-pastele-qrcode]'
      );

      if (existing) {
        existing.addEventListener(
          "load",
          () => resolve(window.QRCode)
        );

        existing.addEventListener(
          "error",
          () => reject(
            new Error("Library QR tidak dapat dimuat.")
          )
        );

        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";

      script.async = true;
      script.dataset.pasteleQrcode = "true";

      script.onload = () => {
        if (window.QRCode) {
          resolve(window.QRCode);
        } else {
          reject(
            new Error("Library QR berhasil dimuat tetapi QRCode tidak tersedia.")
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Library QR tidak dapat dimuat. Gunakan tombol pembayaran Bayar.gg."
          )
        );
      };

      document.head.appendChild(script);
    });

    return qrLibraryPromise;
  };

  /* =========================================================
     RENDER QRIS
     ========================================================= */

  const renderQRCode = async (qrisString, paymentUrl) => {
    const qris = String(qrisString || "").trim();

    if (!qr) {
      return;
    }

    /* -------------------------------------------------------
       No QR string
       ------------------------------------------------------- */

    if (!qris) {
      if (paymentUrl) {
        qr.innerHTML = `
          <div class="qr-loading">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>

            <span>
              QRIS tersedia di halaman checkout Bayar.gg.
            </span>
          </div>
        `;

        return;
      }

      throw new Error(
        "Bayar.gg tidak mengembalikan QRIS atau payment URL."
      );
    }

    /* -------------------------------------------------------
       Loading
       ------------------------------------------------------- */

    qr.innerHTML = `
      <div class="qr-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Menampilkan QRIS Bayar.gg...</span>
      </div>
    `;

    try {
      const QRCode = await loadQRCodeLibrary();

      qr.innerHTML = `
        <div class="qr-title">
          <i class="fa-solid fa-qrcode"></i>
          <span>Scan QRIS Bayar.gg</span>
        </div>

        <div
          id="bayarggQrCanvas"
          class="bayargg-qr"
          aria-label="QRIS Bayar.gg"
        ></div>

        <small class="qr-hint">
          Buka aplikasi bank atau e-wallet lalu scan QR di atas.
        </small>
      `;

      const target = $("bayarggQrCanvas");

      if (!target) {
        throw new Error(
          "Container QRIS tidak ditemukan."
        );
      }

      new QRCode(target, {
        text: qris,
        width: 240,
        height: 240,
        correctLevel:
          QRCode.CorrectLevel?.M ||
          0
      });

    } catch (error) {
      console.warn(
        "[PasTele BayarGG QR]",
        error
      );

      /* -----------------------------------------------------
         QR library gagal → tetap berikan checkout
         ----------------------------------------------------- */

      if (paymentUrl) {
        qr.innerHTML = `
          <div class="qr-loading">
            <i class="fa-solid fa-qrcode"></i>

            <span>
              QR tidak dapat ditampilkan otomatis.
              Gunakan tombol checkout Bayar.gg di bawah.
            </span>
          </div>
        `;

        return;
      }

      throw new Error(
        "QRIS Bayar.gg gagal ditampilkan."
      );
    }
  };

  /* =========================================================
     CREATE BAYAR.GG PAYMENT
     ========================================================= */

  const createPayment = async (order) => {
    if (creating) {
      return;
    }

    creating = true;

    try {
      requireSupabase();

      if (qr) {
        qr.innerHTML = `
          <div class="qr-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Membuat QRIS Bayar.gg...</span>
          </div>
        `;
      }

      /*
       * API KEY TIDAK PERNAH ADA DI SINI.
       *
       * payment.js
       *     ↓
       * Supabase Edge Function
       *     ↓
       * BAYAR GG API
       */

      const result =
        await window.sb.functions.invoke(
          "create-bayargg-payment",
          {
            body: {
              order_id: order.id
            }
          }
        );

      let responseData =
        result?.data || {};

      const invokeError =
        result?.error || null;

      /* -----------------------------------------------------
         Function error
         ----------------------------------------------------- */

      if (invokeError) {
        let serverMessage = "";

        const status = Number(
          invokeError?.context?.status ||
          invokeError?.status ||
          0
        );

        try {
          const context =
            invokeError?.context;

          if (
            context &&
            typeof context.json === "function"
          ) {
            const body =
              await context.json();

            if (
              body &&
              typeof body === "object"
            ) {
              responseData = body;

              serverMessage =
                body.error ||
                body.message ||
                body.details ||
                "";
            }
          }
        } catch (_) {
          /* ignore */
        }

        if (status === 404) {
          throw new Error(
            "Edge Function create-bayargg-payment belum di-deploy di Supabase."
          );
        }

        if (status === 401) {
          throw new Error(
            serverMessage ||
            "Sesi login tidak valid. Silakan login ulang."
          );
        }

        if (status === 403) {
          throw new Error(
            serverMessage ||
            "Akses pembayaran Bayar.gg ditolak."
          );
        }

        if (status === 400) {
          throw new Error(
            serverMessage ||
            "Data pembayaran ditolak Bayar.gg. Periksa nominal dan metode pembayaran."
          );
        }

        if (status >= 500) {
          throw new Error(
            serverMessage ||
            "Server pembayaran mengalami error. Periksa Supabase Edge Function Logs."
          );
        }

        throw new Error(
          serverMessage ||
          invokeError?.message ||
          "Gagal menghubungi server pembayaran."
        );
      }

      /* -----------------------------------------------------
         API response error
         ----------------------------------------------------- */

      if (
        !responseData ||
        responseData.success === false
      ) {
        throw new Error(
          responseData?.error ||
          responseData?.message ||
          "Bayar.gg gagal membuat invoice."
        );
      }

      /*
       * Response Bayar.gg:
       *
       * data.invoice_id
       * data.payment_url
       * data.qris_string
       * data.status
       * data.final_amount
       * data.expires_at
       */

      const data =
        responseData.data &&
        typeof responseData.data === "object"
          ? responseData.data
          : responseData;

      const invoiceId =
        String(
          data.invoice_id ||
          data.invoiceId ||
          ""
        ).trim();

      const paymentUrl =
        String(
          data.payment_url ||
          data.paymentUrl ||
          ""
        ).trim();

      const qrisString =
        String(
          data.qris_string ||
          data.qris ||
          ""
        ).trim();

      const finalAmount =
        Number(
          data.final_amount ??
          data.amount ??
          order.amount ??
          0
        );

      /* -----------------------------------------------------
         Update amount if available
         ----------------------------------------------------- */

      if (
        finalAmount > 0 &&
        $("orderAmount")
      ) {
        $("orderAmount").textContent =
          money(finalAmount);
      }

      /* -----------------------------------------------------
         Save invoice reference locally
         ----------------------------------------------------- */

      if (invoiceId) {
        try {
          localStorage.setItem(
            `pastele_bayargg_invoice_${order.id}`,
            invoiceId
          );
        } catch (_) {}
      }

      /* -----------------------------------------------------
         Payment URL
         ----------------------------------------------------- */

      if (urlBtn) {
        if (paymentUrl) {
          urlBtn.hidden = false;
          urlBtn.href = paymentUrl;
          urlBtn.target = "_blank";
          urlBtn.rel =
            "noopener noreferrer";
        } else {
          urlBtn.hidden = true;
        }
      }

      /* -----------------------------------------------------
         Render QR
         ----------------------------------------------------- */

      await renderQRCode(
        qrisString,
        paymentUrl
      );

      /* -----------------------------------------------------
         Initial status
         ----------------------------------------------------- */

      if (data.status) {
        renderStatus(
          String(data.status)
        );
      }

    } finally {
      creating = false;
    }
  };

  /* =========================================================
     CHECK BAYAR.GG STATUS
     ========================================================= */

  const checkGatewayStatus = async () => {
    requireSupabase();

    const result =
      await window.sb.functions.invoke(
        "check-bayargg-payment",
        {
          body: {
            order_id: orderId
          }
        }
      );

    if (result?.error) {
      console.warn(
        "[PasTele BayarGG Status]",
        result.error
      );

      return null;
    }

    return result?.data || null;
  };

  /* =========================================================
     POLL PAYMENT
     ========================================================= */

  const poll = async () => {
    try {
      const latest =
        await loadOrder();

      if (
        renderStatus(
          latest.status
        )
      ) {
        return;
      }

      /*
       * Webhook adalah sumber utama.
       *
       * Check function hanya fallback.
       */

      const gateway =
        await checkGatewayStatus();

      if (!gateway) {
        return;
      }

      const gatewayStatus =
        String(
          gateway.status ||
          gateway.data?.status ||
          ""
        )
          .trim()
          .toLowerCase();

      if (
        [
          "paid",
          "success",
          "completed",
          "settled"
        ].includes(gatewayStatus)
      ) {
        renderStatus("paid");
      }

    } catch (error) {
      /*
       * Jangan membuat halaman pembayaran
       * error hanya karena polling gagal satu kali.
       */

      console.warn(
        "[PasTele Payment Poll]",
        error
      );
    }
  };

  /* =========================================================
     INIT
     ========================================================= */

  try {
    /* -------------------------------------------------------
       Auth
       ------------------------------------------------------- */

    const user =
      await window.TC?.user?.().catch(
        () => null
      );

    if (!user) {
      const next =
        encodeURIComponent(
          location.href
        );

      location.href =
        `login.html?redirect=${next}`;

      return;
    }

    /* -------------------------------------------------------
       Order ID
       ------------------------------------------------------- */

    if (!orderId) {
      throw new Error(
        "order_id tidak ditemukan."
      );
    }

    /* -------------------------------------------------------
       Supabase
       ------------------------------------------------------- */

    requireSupabase();

    /* -------------------------------------------------------
       Load order
       ------------------------------------------------------- */

    const order =
      await loadOrder();

    /* -------------------------------------------------------
       Order information
       ------------------------------------------------------- */

    if ($("orderId")) {
      $("orderId").textContent =
        order.id;
    }

    if ($("orderAmount")) {
      $("orderAmount").textContent =
        money(order.amount);
    }

    if ($("orderTitle")) {
      $("orderTitle").textContent =
        order.item_title ||
        "PasTele Order";
    }

    if ($("orderType")) {
      $("orderType").textContent =
        String(
          order.item_type ||
          "Pembayaran"
        ).replace(
          /_/g,
          " "
        );
    }

    /* -------------------------------------------------------
       Copy order
       ------------------------------------------------------- */

    const copyBtn =
      $("copyOrder");

    if (copyBtn) {
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(
            String(order.id)
          );

          window.TC?.toast?.(
            "Order ID disalin.",
            "success"
          );

        } catch (_) {
          window.TC?.toast?.(
            "Order ID: " + order.id,
            "success"
          );
        }
      };
    }

    /* -------------------------------------------------------
       Show content
       ------------------------------------------------------- */

    if (content) {
      content.hidden = false;
    }

    if (loading) {
      loading.hidden = true;
    }

    if (errorBox) {
      errorBox.hidden = true;
    }

    /* -------------------------------------------------------
       Existing status
       ------------------------------------------------------- */

    if (
      renderStatus(
        order.status
      )
    ) {
      return;
    }

    const currentStatus =
      String(
        order.status || ""
      ).toLowerCase();

    /* -------------------------------------------------------
       Don't recreate failed order
       ------------------------------------------------------- */

    if (
      [
        "failed",
        "cancelled",
        "canceled",
        "expired"
      ].includes(currentStatus)
    ) {
      return;
    }

    /* -------------------------------------------------------
       Create Bayar.gg invoice
       ------------------------------------------------------- */

    await createPayment(order);

    /* -------------------------------------------------------
       Auto polling
       ------------------------------------------------------- */

    timer =
      setInterval(
        poll,
        5000
      );

    /* -------------------------------------------------------
       Manual check
       ------------------------------------------------------- */

    if (checkBtn) {
      checkBtn.onclick =
        async () => {
          if (
            checkBtn.disabled
          ) {
            return;
          }

          checkBtn.disabled =
            true;

          const originalHTML =
            checkBtn.innerHTML;

          checkBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Mengecek...
          `;

          try {
            const latest =
              await loadOrder();

            if (
              renderStatus(
                latest.status
              )
            ) {
              return;
            }

            const gateway =
              await checkGatewayStatus();

            const gatewayStatus =
              String(
                gateway?.status ||
                gateway?.data?.status ||
                ""
              )
                .trim()
                .toLowerCase();

            if (
              [
                "paid",
                "success",
                "completed",
                "settled"
              ].includes(
                gatewayStatus
              )
            ) {
              renderStatus(
                "paid"
              );
            } else {
              window.TC?.toast?.(
                "Pembayaran belum diterima.",
                "info"
              );
            }

          } catch (error) {
            console.error(
              "[PasTele Manual Check]",
              error
            );

            window.TC?.toast?.(
              error?.message ||
              "Gagal mengecek status pembayaran.",
              "error"
            );

          } finally {
            if (!finishing) {
              checkBtn.disabled =
                false;

              checkBtn.innerHTML =
                originalHTML;
            }
          }
        };
    }

    /* -------------------------------------------------------
       Cleanup
       ------------------------------------------------------- */

    window.addEventListener(
      "beforeunload",
      () => {
        clearInterval(timer);
      }
    );

  } catch (error) {
    console.error(
      "[PasTele BayarGG Payment]",
      error
    );

    fail(
      error?.message ||
      "Pembayaran gagal disiapkan."
    );
  }
});
