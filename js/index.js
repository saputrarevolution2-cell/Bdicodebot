/* =========================================================
   PasTele — INDEX
   SOURCE: /js/index.js
   VERSION: 2026-09-09
   FINAL SQL SYNC
   ---------------------------------------------------------
   Compatible with:
   SUPABASE_MASTER_FINAL_PENDING_H1_H2_FINAL.sql
   SQL RPC:
   get_public_workspace_stats()
   RETURNS:
   - users
   - products
   - orders
   - sales
   PUBLIC VIEW:
   marketplace_public
   ========================================================= */
document.addEventListener(
  'DOMContentLoaded',
  async () => {
    'use strict';
    /* =====================================================
       DOM
       ===================================================== */
    const $ = (id) =>
      document.getElementById(id);
    /* =====================================================
       SUPABASE
       ===================================================== */
    const sb =
      window.sb ||
      window.supabaseClient ||
      window.supabase ||
      null;
    /* =====================================================
       HELPERS
       ===================================================== */
    function esc(value) {
      if (
        typeof window.TC?.esc ===
        'function'
      ) {
        return window.TC.esc(
          value
        );
      }
      return String(
        value ?? ''
      ).replace(
        /[&<>"']/g,
        (char) =>
          ({
            '&':
              '&amp;',
            '<':
              '&lt;',
            '>':
              '&gt;',
            '"':
              '&quot;',
            "'":
              '&#039;'
          })[char]
      );
    }
    function money(value) {
      const amount =
        Number(value || 0);
      if (
        typeof window.TC?.money ===
        'function'
      ) {
        return window.TC.money(
          amount
        );
      }
      if (
        amount <= 0
      ) {
        return 'FREE';
      }
      return new Intl.NumberFormat(
        'id-ID',
        {
          style:
            'currency',
          currency:
            'IDR',
          maximumFractionDigits:
            0
        }
      ).format(
        amount
      );
    }
    function number(value) {
      return Number(
        value || 0
      ).toLocaleString(
        'id-ID'
      );
    }
    function empty(message) {
      return `
        <div class="card landing-empty">
          ${esc(message)}
        </div>
      `;
    }
    /* =====================================================
       TYPING HERO
       ===================================================== */
    function startTyping() {
      const el =
        $('typingWord');
      if (!el) {
        return;
      }
      const words = [
        'link',
        'payment link',
        'code',
        'Telegram'
      ];
      let wordIndex = 0;
      let charIndex = 0;
      let deleting = false;
      const tick = () => {
        const word =
          words[
            wordIndex
          ];
        if (!deleting) {
          el.textContent =
            word.slice(
              0,
              charIndex
            );
          charIndex++;
          if (
            charIndex >
            word.length
          ) {
            deleting = true;
            setTimeout(
              tick,
              1200
            );
            return;
          }
        } else {
          el.textContent =
            word.slice(
              0,
              charIndex
            );
          charIndex--;
          if (
            charIndex < 0
          ) {
            deleting = false;
            wordIndex =
              (
                wordIndex +
                1
              ) %
              words.length;
            charIndex = 0;
          }
        }
        setTimeout(
          tick,
          deleting
            ? 55
            : 85
        );
      };
      tick();
    }
    /* =====================================================
       WORKSPACE STATS
       ===================================================== */
    async function workspace() {
      const set =
        (
          id,
          value
        ) => {
          const element =
            $(id);
          if (
            element
          ) {
            element.textContent =
              value;
          }
        };
      if (!sb) {
        return;
      }
      try {
        /*
         * SQL FINAL:
         *
         * get_public_workspace_stats()
         *
         * {
         *   users,
         *   products,
         *   orders,
         *   sales
         * }
         */
        const {
          data,
          error
        } =
          await sb.rpc(
            'get_public_workspace_stats'
          );
        if (error) {
          throw error;
        }
        const stats =
          (
            data &&
            typeof data ===
              'object'
          )
            ? data
            : {};
        const users =
          Number(
            stats.users ||
            0
          );
        const products =
          Number(
            stats.products ||
            0
          );
        const orders =
          Number(
            stats.orders ||
            0
          );
        const sales =
          Number(
            stats.sales ||
            0
          );
        /*
         * IMPORTANT:
         *
         * SQL final tidak memiliki
         * revenue_trend.
         *
         * Jadi jangan menampilkan
         * data trend palsu.
         */
        set(
          'homeRevenue',
          money(sales)
        );
        set(
          'homeRevenueTrend',
          `${number(orders)} transaksi`
        );
        /*
         * Home counters.
         *
         * Karena SQL public RPC hanya
         * memberikan total products,
         * jangan mengarang breakdown
         * link/code/telegram.
         */
        set(
          'homePaymentCount',
          `${number(products)} item`
        );
        set(
          'homeCodeCount',
          `${number(orders)} transaksi`
        );
        set(
          'homeTelegramCount',
          `${number(users)} pengguna`
        );
        /*
         * Optional semantic labels.
         *
         * Jika HTML menyediakan label
         * khusus, update juga.
         */
        const revenueLabel =
          document.querySelector(
            '[data-home-stat="revenue-label"]'
          );
        if (
          revenueLabel
        ) {
          revenueLabel.textContent =
            'Total Penjualan';
        }
        const paymentLabel =
          document.querySelector(
            '[data-home-stat="payment-label"]'
          );
        if (
          paymentLabel
        ) {
          paymentLabel.textContent =
            'Produk Publik';
        }
        const codeLabel =
          document.querySelector(
            '[data-home-stat="code-label"]'
          );
        if (
          codeLabel
        ) {
          codeLabel.textContent =
            'Pesanan';
        }
        const telegramLabel =
          document.querySelector(
            '[data-home-stat="telegram-label"]'
          );
        if (
          telegramLabel
        ) {
          telegramLabel.textContent =
            'Pengguna';
        }
        document
          .querySelector(
            '.hero-card'
          )
          ?.classList.add(
            'stats-ready'
          );
      } catch (error) {
        console.warn(
          '[PasTele] Workspace stats unavailable:',
          error
        );
        /*
         * Never leave spinner /
         * undefined values.
         */
        set(
          'homeRevenue',
          'Rp 0'
        );
        set(
          'homeRevenueTrend',
          '0 transaksi'
        );
        set(
          'homePaymentCount',
          '0 item'
        );
        set(
          'homeCodeCount',
          '0 transaksi'
        );
        set(
          'homeTelegramCount',
          '0 pengguna'
        );
      }
    }
    /* =====================================================
       MARKETPLACE
       ===================================================== */
    async function market() {
      const box =
        $('market');
      if (!box) {
        return;
      }
      /*
       * Marketplace tidak boleh
       * memaksa halaman gagal jika
       * Supabase belum siap.
       */
      if (!sb) {
        box.innerHTML =
          empty(
            'Marketplace siap. Database belum terhubung.'
          );
        return;
      }
      try {
        /*
         * SQL FINAL:
         *
         * marketplace_public
         *
         * Hanya produk:
         * status IN ('published','active')
         */
        const {
          data,
          error
        } =
          await sb
            .from(
              'marketplace_public'
            )
            .select(
              [
                'id',
                'slug',
                'title',
                'type',
                'access_type',
                'price',
                'thumbnail_url',
                'description',
                'views',
                'sales_count',
                'category',
                'created_at',
                'creator_name',
                'creator_username',
                'owner_id'
              ].join(',')
            )
            .order(
              'created_at',
              {
                ascending:
                  false
              }
            )
            .limit(
              60
            );
        if (error) {
          throw error;
        }
        const items =
          Array.isArray(data)
            ? data
            : [];
        /* =================================================
           ICON
           ================================================= */
        const icon = (
          type
        ) => {
          const key =
            String(
              type || ''
            )
              .trim()
              .toLowerCase();
          return (
            {
              code:
                'fa-code',
              product:
                'fa-box',
              channel:
                'fa-broadcast-tower',
              group:
                'fa-users',
              link:
                'fa-link',
              paste:
                'fa-file-lines',
              pastelink:
                'fa-link',
              payment:
                'fa-credit-card'
            }[key] ||
            'fa-cube'
          );
        };
        /* =================================================
           PRODUCT URL
           ================================================= */
        const productUrl =
          (item) => {
            const id =
              item?.id ||
              '';
            const type =
              item?.type ||
              '';
            return (
              `product.html?id=${encodeURIComponent(
                id
              )}&type=${encodeURIComponent(
                type
              )}`
            );
          };
        /* =================================================
           MARKET CARDS
           ================================================= */
        const cards =
          items
            .slice(
              0,
              8
            )
            .map(
              (item) => {
                const access =
                  String(
                    item.access_type ||
                    'free'
                  )
                    .trim()
                    .toLowerCase();
                const price =
                  Number(
                    item.price ||
                    0
                  );
                const thumbnail =
                  String(
                    item.thumbnail_url ||
                    ''
                  ).trim();
                return `
                  <a
                    class="card product"
                    href="${esc(
                      productUrl(
                        item
                      )
                    )}"
                  >
                    <div class="thumb">
                      ${
                        thumbnail
                          ? `
                            <img
                              src="${esc(
                                thumbnail
                              )}"
                              alt="${esc(
                                item.title ||
                                'Product'
                              )}"
                              loading="lazy"
                              onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                            >
                            <i
                              class="fa-solid ${esc(
                                icon(
                                  item.type
                                )
                              )}"
                              aria-hidden="true"
                              style="display:none"
                            ></i>
                          `
                          : `
                            <i
                              class="fa-solid ${esc(
                                icon(
                                  item.type
                                )
                              )}"
                              aria-hidden="true"
                            ></i>
                          `
                      }
                    </div>
                    <div class="pbody">
                      <span class="pill">
                        ${esc(
                          access.toUpperCase()
                        )}
                      </span>
                      <h3>
                        ${esc(
                          item.title ||
                          'Untitled'
                        )}
                      </h3>
                      <div class="meta">
                        <span class="muted">
                          ${esc(
                            item.category ||
                            'General'
                          )}
                        </span>
                        <span class="price">
                          ${
                            price > 0
                              ? esc(
                                  money(
                                    price
                                  )
                                )
                              : 'FREE'
                          }
                        </span>
                      </div>
                      ${
                        item.creator_name ||
                        item.creator_username
                          ? `
                            <small class="creator">
                              ${esc(
                                item.creator_name ||
                                item.creator_username ||
                                ''
                              )}
                            </small>
                          `
                          : ''
                      }
                    </div>
                  </a>
                `;
              }
            )
            .join('');
        box.innerHTML =
          cards ||
          empty(
            'Belum ada produk publik dari member.'
          );
        /* =================================================
           TOP CONTENT
           ================================================= */
        const sets = [
          [
            'topLink',
            [
              'link',
              'paste',
              'pastelink',
              'payment'
            ]
          ],
          [
            'topCode',
            [
              'code',
              'product'
            ]
          ],
          [
            'topChannel',
            [
              'channel'
            ]
          ]
        ];
        for (
          const [
            target,
            types
          ]
            of sets
        ) {
          const node =
            $(target);
          if (!node) {
            continue;
          }
          const arr =
            items
              .filter(
                (item) =>
                  types.includes(
                    String(
                      item.type ||
                      ''
                    )
                      .trim()
                      .toLowerCase()
                  )
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  Number(
                    b.views ||
                    0
                  ) -
                  Number(
                    a.views ||
                    0
                  )
              )
              .slice(
                0,
                10
              );
          node.innerHTML =
            arr.length
              ? arr
                  .map(
                    (
                      item,
                      index
                    ) => `
                      <div class="topitem">
                        <span class="rank">
                          #${index + 1}
                        </span>
                        <span>
                          <b>
                            ${esc(
                              item.title ||
                              'Untitled'
                            )}
                          </b>
                          <small>
                            ${number(
                              item.views ||
                              0
                            )}
                            views
                            ·
                            ${
                              Number(
                                item.price ||
                                0
                              ) > 0
                                ? esc(
                                    money(
                                      item.price
                                    )
                                  )
                                : 'FREE'
                            }
                          </small>
                        </span>
                      </div>
                    `
                  )
                  .join('')
              : `
                  <div class="muted">
                    Belum ada data.
                  </div>
                `;
        }
      } catch (error) {
        console.error(
          '[PasTele] Marketplace:',
          error
        );
        box.innerHTML =
          empty(
            'Marketplace belum dapat memuat data saat ini.'
          );
        /*
         * Jangan membuat halaman
         * crash hanya karena marketplace.
         */
        [
          'topLink',
          'topCode',
          'topChannel'
        ].forEach(
          (id) => {
            const node =
              $(id);
            if (
              node
            ) {
              node.innerHTML =
                `
                  <div class="muted">
                    Data belum tersedia.
                  </div>
                `;
            }
          }
        );
      }
    }
    /* =====================================================
       INIT
       ===================================================== */
    startTyping();
    /*
     * Workspace dan marketplace
     * berjalan paralel.
     *
     * Kegagalan salah satu tidak
     * mematikan halaman.
     */
    await Promise.allSettled([
      workspace(),
      market()
    ]);
  }
);
