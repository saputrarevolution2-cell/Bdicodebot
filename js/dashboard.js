/* =========================================================
   PasTele — DASHBOARD
   SOURCE: /js/dashboard.js
   VERSION: 2026-09-08
   Clean / Real Supabase Data / 7-Day Analytics
   Compatible with dashboard.html
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  /* =======================================================
     GLOBAL CORE
     ======================================================= */

  const core = window.TC || {};
  const supabase = window.sb;

  if (!supabase) {
    console.error('PasTele Dashboard: Supabase client tidak ditemukan.');

    if ($('activity')) {
      $('activity').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>Supabase belum siap.</span>
        </div>
      `;
    }

    return;
  }

  /* =======================================================
     HELPERS
     ======================================================= */

  const fallbackEsc = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const esc = (value) =>
    typeof core.esc === 'function'
      ? core.esc(value)
      : fallbackEsc(value);

  const number = (value) => {
    const n = Number(value || 0);

    return n.toLocaleString('id-ID');
  };

  const fallbackMoney = (value) => {
    const n = Number(value || 0);

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(n);
  };

  const money = (value) => {
    const n = Number(value || 0);

    return typeof core.money === 'function'
      ? core.money(n)
      : fallbackMoney(n);
  };

  const toast = (message, type = 'info') => {
    if (typeof core.toast === 'function') {
      core.toast(message, type);
      return;
    }

    const box = $('toast');

    if (!box) {
      return;
    }

    box.textContent = String(message || '');

    box.className = '';
    box.classList.add(`toast-${type}`);

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      box.className = '';
      box.textContent = '';
    }, 3500);
  };

  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();

  const safeDate = (value) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  };

  const startOfDay = (value) => {
    const date = new Date(value);

    date.setHours(0, 0, 0, 0);

    return date;
  };

  const addDays = (value, amount) => {
    const date = new Date(value);

    date.setDate(
      date.getDate() + amount
    );

    return date;
  };

  const dateKey = (value) => {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatDay = (date) =>
    date.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }
    );

  const formatDate = (value) => {
    const date = safeDate(value);

    if (!date) {
      return '-';
    }

    return date.toLocaleDateString(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  const formatDateTime = (value) => {
    const date = safeDate(value);

    if (!date) {
      return '-';
    }

    return date.toLocaleString('id-ID');
  };

  /* =======================================================
     PAGINATION HELPER
     ======================================================= */

  async function fetchAll(buildQuery, pageSize = 1000) {
    const all = [];

    let from = 0;

    while (true) {
      const to = from + pageSize - 1;

      const query = buildQuery();

      const {
        data,
        error
      } = await query.range(from, to);

      if (error) {
        throw error;
      }

      const rows = Array.isArray(data)
        ? data
        : [];

      all.push(...rows);

      if (rows.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return all;
  }

  /* =======================================================
     AUTH
     ======================================================= */

  let user = null;

  try {
    if (typeof core.user !== 'function') {
      throw new Error(
        'TC.user() tidak tersedia.'
      );
    }

    user = await core.user();
  } catch (error) {
    console.error(
      'Dashboard auth error:',
      error
    );

    location.replace('login.html');

    return;
  }

  if (!user) {
    location.replace('login.html');

    return;
  }

  /* =======================================================
     GREETING
     ======================================================= */

  if ($('helloName')) {
    $('helloName').textContent =
      user.user_metadata?.username ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';
  }

  /* =======================================================
     DATE RANGE
     ======================================================= */

  const today = startOfDay(new Date());

  /*
   * CURRENT
   * 6 hari sebelumnya + hari ini = 7 hari
   */

  const currentStart =
    addDays(today, -6);

  /*
   * PREVIOUS
   * 7 hari sebelum current
   */

  const previousStart =
    addDays(today, -13);

  const currentDays =
    Array.from(
      { length: 7 },
      (_, index) =>
        addDays(
          currentStart,
          index
        )
    );

  const previousDays =
    Array.from(
      { length: 7 },
      (_, index) =>
        addDays(
          previousStart,
          index
        )
    );

  const currentDayKeys =
    new Set(
      currentDays.map(dateKey)
    );

  const previousDayKeys =
    new Set(
      previousDays.map(dateKey)
    );

  /*
   * Ambil data analytics hanya dari
   * periode yang diperlukan.
   *
   * Sedikit buffer supaya aman terhadap
   * timezone UTC.
   */

  const queryStart =
    addDays(
      previousStart,
      -1
    ).toISOString();

  const queryEnd =
    addDays(
      today,
      1
    ).toISOString();

  /* =======================================================
     SCOPE
     ======================================================= */

  const getScope = () =>
    $('scope')?.value || 'all';

  const matchProductType = (
    type,
    scope
  ) => {
    const normalized =
      normalize(type);

    if (scope === 'all') {
      return true;
    }

    if (scope === 'paste') {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(normalized);
    }

    return normalized === scope;
  };

  const matchTelegramProduct = (
    item,
    scope
  ) => {
    if (scope === 'all') {
      return true;
    }

    if (scope !== 'code') {
      return false;
    }

    const type =
      normalize(
        item?.product_type
      );

    return [
      'code',
      'product',
      'file'
    ].includes(type);
  };

  const matchChannel = (
    item,
    scope
  ) => {
    if (scope === 'all') {
      return true;
    }

    return (
      normalize(item?.type) ===
      normalize(scope)
    );
  };

  const matchEvent = (
    event,
    scope
  ) => {
    if (scope === 'all') {
      return true;
    }

    const target =
      normalize(
        event?.target_type
      );

    if (scope === 'paste') {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(target);
    }

    if (scope === 'code') {
      return [
        'code',
        'product',
        'file'
      ].includes(target);
    }

    if (scope === 'channel') {
      return target === 'channel';
    }

    if (scope === 'group') {
      return target === 'group';
    }

    return false;
  };

  /* =======================================================
     TREND
     ======================================================= */

  const calculateTrend = (
    current,
    previous
  ) => {
    const currentValue =
      Number(current || 0);

    const previousValue =
      Number(previous || 0);

    if (
      currentValue === 0 &&
      previousValue === 0
    ) {
      return {
        direction: 'stable',
        icon: 'fa-minus',
        label: '0%',
        percent: 0
      };
    }

    if (
      previousValue === 0 &&
      currentValue > 0
    ) {
      return {
        direction: 'up',
        icon: 'fa-arrow-trend-up',
        label: '+100%',
        percent: 100
      };
    }

    const percent =
      (
        (currentValue -
          previousValue) /
        previousValue
      ) * 100;

    if (
      Math.abs(percent) < 0.05
    ) {
      return {
        direction: 'stable',
        icon: 'fa-minus',
        label: '0%',
        percent: 0
      };
    }

    const rounded =
      Math.abs(percent).toFixed(1);

    if (percent > 0) {
      return {
        direction: 'up',
        icon: 'fa-arrow-trend-up',
        label: `+${rounded}%`,
        percent
      };
    }

    return {
      direction: 'down',
      icon: 'fa-arrow-trend-down',
      label: `-${rounded}%`,
      percent
    };
  };

  const renderTrend = (
    elementId,
    trend
  ) => {
    const element =
      $(elementId);

    if (!element || !trend) {
      return;
    }

    element.className =
      `trend trend-${trend.direction}`;

    element.innerHTML = `
      <i
        class="fa-solid ${esc(trend.icon)}"
        aria-hidden="true"
      ></i>
      <span>
        ${esc(trend.label)}
      </span>
    `;
  };

  /* =======================================================
     PAGINATION UI
     ======================================================= */

  function renderPager(
    id,
    page,
    total,
    onChange
  ) {
    const host = $(id);

    if (!host) {
      return;
    }

    if (total <= 1) {
      host.innerHTML = '';
      return;
    }

    const buttons = [];

    buttons.push(`
      <button
        type="button"
        ${page === 1 ? 'disabled' : ''}
        data-p="${page - 1}"
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
    `);

    for (
      let i = 1;
      i <= total;
      i++
    ) {
      if (
        total > 7 &&
        i > 2 &&
        i < total - 1 &&
        Math.abs(i - page) > 1
      ) {
        if (
          i === 3 ||
          i === total - 2
        ) {
          buttons.push(
            '<span>…</span>'
          );
        }

        continue;
      }

      buttons.push(`
        <button
          type="button"
          class="${i === page ? 'active' : ''}"
          data-p="${i}"
        >
          ${i}
        </button>
      `);
    }

    buttons.push(`
      <button
        type="button"
        ${page === total ? 'disabled' : ''}
        data-p="${page + 1}"
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    `);

    host.innerHTML =
      buttons.join('');

    host
      .querySelectorAll(
        'button[data-p]'
      )
      .forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            const next =
              Number(
                button.dataset.p
              );

            if (
              Number.isFinite(next) &&
              next >= 1 &&
              next <= total &&
              next !== page
            ) {
              onChange(next);
            }
          }
        );
      });
  }

  /* =======================================================
     PERFORMANCE SNAPSHOT
     ======================================================= */

  const performanceSnapshot = {
    views: {
      label: 'Views',
      value: 0,
      trend: null
    },

    sales: {
      label: 'Sales',
      value: 0,
      trend: null
    },

    share: {
      label: 'Share',
      value: 0,
      trend: null
    },

    revenue: {
      label: 'Revenue',
      value: 0,
      trend: null
    }
  };

  /* =======================================================
     CHART
     ======================================================= */

  const renderChart = (
    chartData
  ) => {
    const chart = $('chart');

    if (!chart) {
      return;
    }

    const max = Math.max(
      1,
      ...currentDays.map(
        (day) => {
          const item =
            chartData[
              dateKey(day)
            ] || {};

          return Math.max(
            Number(item.views || 0),
            Number(item.sales || 0),
            Number(item.share || 0)
          );
        }
      )
    );

    chart.innerHTML =
      currentDays
        .map((day) => {
          const key =
            dateKey(day);

          const item =
            chartData[key] || {
              views: 0,
              sales: 0,
              share: 0,
              revenue: 0
            };

          const views =
            Number(
              item.views || 0
            );

          const sales =
            Number(
              item.sales || 0
            );

          const share =
            Number(
              item.share || 0
            );

          const viewsHeight =
            views > 0
              ? Math.max(
                  3,
                  (views / max) * 100
                )
              : 2;

          const salesHeight =
            sales > 0
              ? Math.max(
                  3,
                  (sales / max) * 100
                )
              : 2;

          const shareHeight =
            share > 0
              ? Math.max(
                  3,
                  (share / max) * 100
                )
              : 2;

          return `
            <div
              class="chart-day"
              data-date="${esc(key)}"
              tabindex="0"
              role="button"
              title="${esc(
                `${formatDay(day)} — Views ${number(views)}, Sales ${number(sales)}, Share ${number(share)}`
              )}"
            >
              <div class="bars">
                <i
                  class="bar-views"
                  style="height:${viewsHeight}%"
                  aria-label="Views ${number(views)}"
                ></i>

                <i
                  class="bar-sales"
                  style="height:${salesHeight}%"
                  aria-label="Sales ${number(sales)}"
                ></i>

                <i
                  class="bar-share"
                  style="height:${shareHeight}%"
                  aria-label="Share ${number(share)}"
                ></i>
              </div>

              <small>
                ${esc(formatDay(day))}
              </small>
            </div>
          `;
        })
        .join('');

    /*
     * Chart day dibuat clickable.
     */

    chart
      .querySelectorAll(
        '.chart-day'
      )
      .forEach((dayElement) => {
        const handler = () => {
          const key =
            dayElement.dataset.date;

          const item =
            chartData[key] || {};

          toast(
            `${formatDate(key)} · Views ${number(item.views || 0)} · Sales ${number(item.sales || 0)} · Share ${number(item.share || 0)} · Revenue ${money(item.revenue || 0)}`,
            'info'
          );
        };

        dayElement.addEventListener(
          'click',
          handler
        );

        dayElement.addEventListener(
          'keydown',
          (event) => {
            if (
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault();
              handler();
            }
          }
        );
      });
  };

  /* =======================================================
     MAIN LOAD
     ======================================================= */

  async function load() {
    const scope =
      getScope();

    /* =====================================================
       DATABASE
       ===================================================== */

    const [
      products,
      pastes,
      codes,
      channels,
      orders,
      transactions,
      analyticsEvents,
      likesResult,
      followsResult
    ] = await Promise.all([
      fetchAll(() =>
        supabase
          .from('products')
          .select(
            [
              'id',
              'title',
              'type',
              'views',
              'sales_count',
              'price',
              'created_at',
              'status'
            ].join(',')
          )
          .eq(
            'creator_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('pastelinks')
          .select(
            'id,slug,title,views,created_at'
          )
          .eq(
            'user_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('telegram_products')
          .select(
            [
              'id',
              'title',
              'product_type',
              'access_type',
              'price',
              'is_published',
              'created_at'
            ].join(',')
          )
          .eq(
            'owner_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('telegram_channels')
          .select(
            [
              'id',
              'name',
              'type',
              'access_type',
              'price',
              'is_published',
              'created_at'
            ].join(',')
          )
          .eq(
            'owner_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('orders')
          .select(
            [
              'id',
              'product_id',
              'item_type',
              'item_id',
              'item_title',
              'amount',
              'status',
              'created_at',
              'paid_at'
            ].join(',')
          )
          .eq(
            'seller_id',
            user.id
          )
          .eq(
            'status',
            'paid'
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('transactions')
          .select(
            [
              'id',
              'amount',
              'net_amount',
              'type',
              'status',
              'reference',
              'created_at'
            ].join(',')
          )
          .eq(
            'user_id',
            user.id
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      fetchAll(() =>
        supabase
          .from('analytics_events')
          .select(
            [
              'event_type',
              'target_type',
              'target_id',
              'created_at'
            ].join(',')
          )
          .eq(
            'owner_id',
            user.id
          )
          .gte(
            'created_at',
            queryStart
          )
          .lt(
            'created_at',
            queryEnd
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
      ),

      supabase
        .from('content_likes')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'content_owner_id',
          user.id
        ),

      supabase
        .from('creator_followers')
        .select(
          'id',
          {
            count: 'exact',
            head: true
          }
        )
        .eq(
          'creator_id',
          user.id
        )
    ]);

    /* =====================================================
       ERROR CHECK
       ===================================================== */

    if (
      likesResult?.error
    ) {
      throw likesResult.error;
    }

    if (
      followsResult?.error
    ) {
      throw followsResult.error;
    }

    /* =====================================================
       FILTER CONTENT
       ===================================================== */

    const filteredProducts =
      products.filter(
        (item) =>
          matchProductType(
            item.type,
            scope
          )
      );

    const filteredPastes =
      (
        scope === 'all' ||
        scope === 'paste'
      )
        ? pastes
        : [];

    const filteredCodes =
      codes.filter(
        (item) =>
          matchTelegramProduct(
            item,
            scope
          )
      );

    const filteredChannels =
      channels.filter(
        (item) =>
          matchChannel(
            item,
            scope
          )
      );

    /* =====================================================
       FILTER ANALYTICS
       ===================================================== */

    const scopedEvents =
      analyticsEvents.filter(
        (event) =>
          matchEvent(
            event,
            scope
          )
      );

    /* =====================================================
       CONTENT COUNT
       ===================================================== */

    const createdCount =
      filteredProducts.length +
      filteredPastes.length +
      filteredCodes.length +
      filteredChannels.length;

    if ($('created')) {
      $('created').textContent =
        number(createdCount);
    }

    if ($('detailContent')) {
      $('detailContent').textContent =
        number(createdCount);
    }

    /* =====================================================
       TOTAL LINK / CODE / CHANNEL
       ===================================================== */

    const totalLink =
      products.filter(
        (item) =>
          [
            'link',
            'paste',
            'pastelink'
          ].includes(
            normalize(item.type)
          )
      ).length +
      pastes.length;

    const totalCode =
      codes.filter(
        (item) => {
          const type =
            normalize(
              item.product_type
            );

          return [
            'code',
            'product',
            'file'
          ].includes(type);
        }
      ).length;

    const totalChannel =
      channels.filter(
        (item) =>
          normalize(
            item.type
          ) === 'channel'
      ).length;

    if ($('totalLink')) {
      $('totalLink').textContent =
        number(totalLink);
    }

    if ($('totalCode')) {
      $('totalCode').textContent =
        number(totalCode);
    }

    if ($('totalChannel')) {
      $('totalChannel').textContent =
        number(totalChannel);
    }

    /* =====================================================
       TOTAL VIEWS
       ===================================================== */

    /*
     * Products dan Pastelink mempunyai
     * counter views tersimpan.
     */

    const storedViews =
      filteredProducts.reduce(
        (total, item) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredPastes.reduce(
        (total, item) =>
          total +
          Number(
            item.views || 0
          ),
        0
      );

    /*
     * Analytics view untuk periode
     * yang tersedia.
     *
     * Telegram content tidak mempunyai
     * counter views pada tabel tersebut,
     * sehingga event view digunakan.
     */

    const eventViews =
      scopedEvents.filter(
        (event) =>
          normalize(
            event.event_type
          ) === 'view'
      ).length;

    /*
     * Jangan menjumlahkan stored counter
     * dengan event history karena bisa
     * double count.
     */

    const totalViews =
      Math.max(
        storedViews,
        eventViews
      );

    if ($('views')) {
      $('views').textContent =
        number(totalViews);
    }

    if ($('detailViews')) {
      $('detailViews').textContent =
        number(totalViews);
    }

    /* =====================================================
       SALES SOURCE
       ===================================================== */

    /*
     * Canonical sales:
     *
     * 1. Paid orders
     * 2. Direct sell_* transactions
     *
     * seller transaction yang reference-nya
     * sama dengan paid order TIDAK dihitung lagi.
     */

    const paidOrderIds =
      new Set(
        orders.map(
          (order) =>
            String(order.id)
        )
      );

    const directSellTransactions =
      transactions.filter(
        (transaction) => {
          const type =
            normalize(
              transaction.type
            );

          const status =
            normalize(
              transaction.status
            );

          const reference =
            String(
              transaction.reference ??
              ''
            );

          return (
            type.startsWith(
              'sell_'
            ) &&
            [
              'completed',
              'paid',
              'success'
            ].includes(status) &&
            !paidOrderIds.has(
              reference
            )
          );
        }
      );

    /* =====================================================
       ORDER TYPE
       ===================================================== */

    const productById =
      new Map(
        products.map(
          (item) => [
            String(item.id),
            item
          ]
        )
      );

    const getOrderType = (
      order
    ) => {
      const explicit =
        normalize(
          order.item_type
        );

      if (explicit) {
        return explicit;
      }

      if (
        order.product_id
      ) {
        const product =
          productById.get(
            String(
              order.product_id
            )
          );

        if (product) {
          return normalize(
            product.type
          );
        }
      }

      return '';
    };

    const matchSaleScope = (
      type
    ) => {
      if (scope === 'all') {
        return true;
      }

      const normalized =
        normalize(type);

      if (scope === 'paste') {
        return [
          'link',
          'paste',
          'pastelink'
        ].includes(
          normalized
        );
      }

      if (scope === 'code') {
        return [
          'code',
          'product',
          'file'
        ].includes(
          normalized
        );
      }

      return (
        normalized === scope
      );
    };

    const scopedOrders =
      orders.filter(
        (order) =>
          matchSaleScope(
            getOrderType(order)
          )
      );

    const scopedDirectTransactions =
      directSellTransactions.filter(
        (transaction) => {
          const type =
            normalize(
              transaction.type
            )
              .replace(
                /^sell_/,
                ''
              );

          return matchSaleScope(
            type
          );
        }
      );

    /* =====================================================
       SELL REVENUE
       ===================================================== */

    const sellerTransactionByOrder =
      new Map();

    transactions.forEach(
      (transaction) => {
        const type =
          normalize(
            transaction.type
          );

        const status =
          normalize(
            transaction.status
          );

        if (
          !type.startsWith(
            'sell_'
          )
        ) {
          return;
        }

        if (
          ![
            'completed',
            'paid',
            'success'
          ].includes(status)
        ) {
          return;
        }

        const reference =
          String(
            transaction.reference ??
            ''
          );

        if (
          reference &&
          paidOrderIds.has(
            reference
          )
        ) {
          sellerTransactionByOrder.set(
            reference,
            transaction
          );
        }
      }
    );

    /* =====================================================
       CANONICAL SALES
       ===================================================== */

    const saleRows = [];

    scopedOrders.forEach(
      (order) => {
        const orderId =
          String(order.id);

        const sellerTransaction =
          sellerTransactionByOrder.get(
            orderId
          );

        const transactionValue =
          sellerTransaction
            ? Number(
                sellerTransaction.net_amount ??
                sellerTransaction.amount ??
                0
              )
            : null;

        const revenue =
          transactionValue !== null
            ? transactionValue
            : Number(
                order.amount || 0
              );

        saleRows.push({
          id: `order:${orderId}`,
          source: 'order',
          type:
            getOrderType(order),
          date:
            order.created_at,
          revenue
        });
      }
    );

    scopedDirectTransactions.forEach(
      (transaction) => {
        saleRows.push({
          id: `transaction:${transaction.id}`,
          source: 'transaction',
          type:
            normalize(
              transaction.type
            ).replace(
              /^sell_/,
              ''
            ),
          date:
            transaction.created_at,
          revenue:
            Number(
              transaction.net_amount ??
              transaction.amount ??
              0
            )
        });
      }
    );

    /* =====================================================
       SALES TOTAL
       ===================================================== */

    const totalSales =
      saleRows.length;

    const totalRevenue =
      saleRows.reduce(
        (total, sale) =>
          total +
          Number(
            sale.revenue || 0
          ),
        0
      );

    if ($('sales')) {
      $('sales').textContent =
        number(totalSales);
    }

    if ($('detailSales')) {
      $('detailSales').textContent =
        number(totalSales);
    }

    if ($('revenue')) {
      $('revenue').textContent =
        money(totalRevenue);
    }

    if ($('detailRevenue')) {
      $('detailRevenue').textContent =
        money(totalRevenue);
    }

    /* =====================================================
       INTERACTIONS
       ===================================================== */

    const countEvent =
      (type) =>
        scopedEvents.filter(
          (event) =>
            normalize(
              event.event_type
            ) === normalize(type)
        ).length;

    const likeCount =
      Number(
        likesResult.count || 0
      );

    const followerCount =
      Number(
        followsResult.count || 0
      );

    const shareCount =
      countEvent('share');

    if ($('interactions')) {
      const items = [
        {
          icon: 'fa-eye',
          label: 'Views',
          value: totalViews,
          color: 'blue'
        },

        {
          icon: 'fa-heart',
          label: 'Like',
          value: likeCount,
          color: 'pink'
        },

        {
          icon: 'fa-share-nodes',
          label: 'Share',
          value: shareCount,
          color: 'violet'
        },

        {
          icon: 'fa-user-plus',
          label: 'Follower',
          value: followerCount,
          color: 'green'
        }
      ];

      $('interactions').innerHTML =
        items
          .map(
            (item) => `
              <div class="circle-stat ${esc(item.color)}">
                <div class="circle">
                  <i
                    class="fa-solid ${esc(item.icon)}"
                    aria-hidden="true"
                  ></i>
                </div>

                <strong>
                  ${number(item.value)}
                </strong>

                <span>
                  ${esc(item.label)}
                </span>
              </div>
            `
          )
          .join('');
    }

    /* =====================================================
       7 DAY CHART DATA
       ===================================================== */

    const chartData = {};

    currentDays.forEach(
      (day) => {
        chartData[
          dateKey(day)
        ] = {
          views: 0,
          sales: 0,
          share: 0,
          revenue: 0
        };
      }
    );

    /* =====================================================
       CURRENT / PREVIOUS EVENTS
       ===================================================== */

    const previousData = {
      views: 0,
      sales: 0,
      share: 0,
      revenue: 0
    };

    for (
      const event of scopedEvents
    ) {
      const date =
        safeDate(
          event.created_at
        );

      if (!date) {
        continue;
      }

      const key =
        dateKey(date);

      const type =
        normalize(
          event.event_type
        );

      /*
       * CURRENT
       */

      if (
        currentDayKeys.has(key)
      ) {
        if (type === 'view') {
          chartData[key].views++;
        }

        if (type === 'share') {
          chartData[key].share++;
        }
      }

      /*
       * PREVIOUS
       */

      if (
        previousDayKeys.has(key)
      ) {
        if (type === 'view') {
          previousData.views++;
        }

        if (type === 'share') {
          previousData.share++;
        }
      }
    }

    /* =====================================================
       SALES INTO CHART
       ===================================================== */

    saleRows.forEach(
      (sale) => {
        const date =
          safeDate(
            sale.date
          );

        if (!date) {
          return;
        }

        const key =
          dateKey(date);

        if (
          currentDayKeys.has(key)
        ) {
          chartData[key].sales++;

          chartData[key].revenue +=
            Number(
              sale.revenue || 0
            );
        }

        if (
          previousDayKeys.has(key)
        ) {
          previousData.sales++;

          previousData.revenue +=
            Number(
              sale.revenue || 0
            );
        }
      }
    );

    /* =====================================================
       CURRENT PERIOD
       ===================================================== */

    const currentData = {
      views: 0,
      sales: 0,
      share: 0,
      revenue: 0
    };

    currentDays.forEach(
      (day) => {
        const item =
          chartData[
            dateKey(day)
          ] || {};

        currentData.views +=
          Number(
            item.views || 0
          );

        currentData.sales +=
          Number(
            item.sales || 0
          );

        currentData.share +=
          Number(
            item.share || 0
          );

        currentData.revenue +=
          Number(
            item.revenue || 0
          );
      }
    );

    /* =====================================================
       TRENDS
       ===================================================== */

    const viewsTrend =
      calculateTrend(
        currentData.views,
        previousData.views
      );

    const salesTrend =
      calculateTrend(
        currentData.sales,
        previousData.sales
      );

    const shareTrend =
      calculateTrend(
        currentData.share,
        previousData.share
      );

    const revenueTrend =
      calculateTrend(
        currentData.revenue,
        previousData.revenue
      );

    /* =====================================================
       TREND IDS FROM dashboard.html
       ===================================================== */

    renderTrend(
      'performanceViewsTrend',
      viewsTrend
    );

    renderTrend(
      'performanceSalesTrend',
      salesTrend
    );

    renderTrend(
      'performanceShareTrend',
      shareTrend
    );

    renderTrend(
      'performanceRevenueTrend',
      revenueTrend
    );

    renderTrend(
      'revenueTrendChange',
      revenueTrend
    );

    /* =====================================================
       PERFORMANCE SNAPSHOT
       ===================================================== */

    performanceSnapshot.views = {
      label: 'Views',
      value: currentData.views,
      trend: viewsTrend
    };

    performanceSnapshot.sales = {
      label: 'Sales',
      value: currentData.sales,
      trend: salesTrend
    };

    performanceSnapshot.share = {
      label: 'Share',
      value: currentData.share,
      trend: shareTrend
    };

    performanceSnapshot.revenue = {
      label: 'Revenue',
      value: currentData.revenue,
      trend: revenueTrend
    };

    /* =====================================================
       PERFORMANCE VALUES
       ===================================================== */

    if ($('performanceViews')) {
      $('performanceViews').textContent =
        number(
          currentData.views
        );
    }

    if ($('performanceSales')) {
      $('performanceSales').textContent =
        number(
          currentData.sales
        );
    }

    if ($('performanceShare')) {
      $('performanceShare').textContent =
        number(
          currentData.share
        );
    }

    if ($('performanceRevenue')) {
      $('performanceRevenue').textContent =
        money(
          currentData.revenue
        );
    }

    /* =====================================================
       PERFORMANCE PERIOD
       ===================================================== */

    const firstDay =
      currentDays[0];

    const lastDay =
      currentDays[
        currentDays.length - 1
      ];

    if ($('performancePeriod')) {
      $('performancePeriod').textContent =
        `${firstDay.toLocaleDateString(
          'id-ID',
          {
            day: '2-digit',
            month: 'short'
          }
        )} – ${lastDay.toLocaleDateString(
          'id-ID',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )}`;
    }

    if ($('periodBadge')) {
      $('periodBadge').textContent =
        '7 Hari';
    }

    /* =====================================================
       PERFORMANCE META
       ===================================================== */

    const performanceMeta =
      document.querySelector(
        '.performance-meta'
      );

    if (performanceMeta) {
      const metaItems =
        performanceMeta.querySelectorAll(
          '.performance-meta-item'
        );

      if (metaItems[0]) {
        const span =
          metaItems[0].querySelector(
            'span'
          );

        if (span) {
          span.textContent =
            `Dibandingkan ${previousDays[0].toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'short'
              }
            )} – ${previousDays[
              previousDays.length - 1
            ].toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }
            )}`;
        }
      }

      if (metaItems[1]) {
        const span =
          metaItems[1].querySelector(
            'span'
          );

        if (span) {
          const trendLabel =
            revenueTrend.label;

          span.textContent =
            `Trend otomatis · ${trendLabel}`;
        }
      }
    }

    /* =====================================================
       REVENUE TREND
       ===================================================== */

    if ($('revenueTrendValue')) {
      $('revenueTrendValue').textContent =
        money(
          currentData.revenue
        );
    }

    /* =====================================================
       REVENUE BARS
       ===================================================== */

    if ($('revenueBars')) {
      const maxRevenue =
        Math.max(
          1,
          ...currentDays.map(
            (day) =>
              Number(
                chartData[
                  dateKey(day)
                ]?.revenue || 0
              )
          )
        );

      $('revenueBars').innerHTML =
        currentDays
          .map(
            (day) => {
              const key =
                dateKey(day);

              const item =
                chartData[key] || {};

              const revenue =
                Number(
                  item.revenue || 0
                );

              const height =
                revenue > 0
                  ? Math.max(
                      3,
                      (
                        revenue /
                        maxRevenue
                      ) * 100
                    )
                  : 2;

              return `
                <div
                  class="revenue-bar"
                  data-date="${esc(key)}"
                  tabindex="0"
                  role="button"
                  title="${esc(
                    `${formatDay(day)} — ${money(revenue)}`
                  )}"
                >
                  <i
                    style="height:${height}%"
                  ></i>

                  <small>
                    ${esc(
                      formatDay(day)
                        .split(' ')[0]
                    )}
                  </small>
                </div>
              `;
            }
          )
          .join('');

      $('revenueBars')
        .querySelectorAll(
          '.revenue-bar'
        )
        .forEach(
          (bar) => {
            const showRevenue =
              () => {
                const item =
                  chartData[
                    bar.dataset.date
                  ] || {};

                toast(
                  `${formatDate(bar.dataset.date)} · Revenue ${money(item.revenue || 0)}`,
                  'info'
                );
              };

            bar.addEventListener(
              'click',
              showRevenue
            );

            bar.addEventListener(
              'keydown',
              (event) => {
                if (
                  event.key ===
                    'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault();
                  showRevenue();
                }
              }
            );
          }
        );
    }

    /* =====================================================
       MAIN CHART
       ===================================================== */

    renderChart(
      chartData
    );

    /* =====================================================
       FOLLOWER
       ===================================================== */

    if ($('followerTotal')) {
      $('followerTotal').textContent =
        number(
          followerCount
        );
    }

    /*
     * dashboard.html masih menyediakan
     * followerCountries.
     *
     * Tetapi schema profiles kamu tidak
     * memiliki kolom country.
     *
     * Jadi JANGAN query:
     * profiles:follower_id(country)
     *
     * karena itu menyebabkan error.
     */

    if ($('followerCountries')) {
      if (followerCount > 0) {
        $('followerCountries').innerHTML = `
          <div class="empty">
            <i class="fa-solid fa-users"></i>
            <span>
              ${number(followerCount)}
              pengikut tercatat.
            </span>
          </div>
        `;
      } else {
        $('followerCountries').innerHTML = `
          <div class="empty">
            <i class="fa-solid fa-user-plus"></i>
            <span>
              Belum ada pengikut.
            </span>
          </div>
        `;
      }
    }

    if ($('followerDonut')) {
      $('followerDonut').style.background =
        followerCount > 0
          ? 'conic-gradient(#229ed9 0 100%)'
          : 'conic-gradient(#dfe7ec 0 100%)';
    }

    /* =====================================================
       RECENT CONTENT
       ===================================================== */

    const recentRows = [
      ...filteredProducts.map(
        (item) => ({
          title:
            item.title ||
            'Untitled',

          type:
            item.type ||
            'link',

          icon:
            normalize(
              item.type
            ) === 'code'
              ? 'fa-code'
              : 'fa-link',

          date:
            item.created_at,

          views:
            Number(
              item.views || 0
            ),

          price:
            Number(
              item.price || 0
            )
        })
      ),

      ...filteredPastes.map(
        (item) => ({
          title:
            item.title ||
            item.slug ||
            'PasteLink',

          type:
            'pastelink',

          icon:
            'fa-file-lines',

          date:
            item.created_at,

          views:
            Number(
              item.views || 0
            ),

          price: 0
        })
      ),

      ...filteredCodes.map(
        (item) => ({
          title:
            item.title ||
            'Code',

          type:
            item.product_type ||
            'code',

          icon:
            'fa-code',

          date:
            item.created_at,

          views: 0,

          price:
            Number(
              item.price || 0
            )
        })
      ),

      ...filteredChannels.map(
        (item) => ({
          title:
            item.name ||
            'Telegram',

          type:
            item.type ||
            'channel',

          icon:
            normalize(
              item.type
            ) === 'group'
              ? 'fa-users'
              : 'fa-broadcast-tower',

          date:
            item.created_at,

          views: 0,

          price:
            Number(
              item.price || 0
            )
        })
      )
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(a.date)
            ?.getTime() || 0;

        const dateB =
          safeDate(b.date)
            ?.getTime() || 0;

        return dateB - dateA;
      }
    );

    const recentPageSize = 5;

    let recentPage = 1;

    const renderRecent = () => {
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            recentRows.length /
            recentPageSize
          )
        );

      recentPage =
        Math.min(
          recentPage,
          totalPages
        );

      const start =
        (
          recentPage - 1
        ) * recentPageSize;

      const rows =
        recentRows.slice(
          start,
          start + recentPageSize
        );

      if ($('recentLinks')) {
        $('recentLinks').innerHTML =
          rows.length
            ? rows
                .map(
                  (item) => `
                    <div class="recent-item">
                      <span class="recent-icon">
                        <i
                          class="fa-solid ${esc(item.icon)}"
                          aria-hidden="true"
                        ></i>
                      </span>

                      <div>
                        <b>
                          ${esc(item.title)}
                        </b>

                        <small>
                          ${esc(
                            String(
                              item.type ||
                              'content'
                            )
                          )}
                          ·
                          ${esc(
                            formatDate(
                              item.date
                            )
                          )}
                        </small>
                      </div>

                      <strong>
                        ${
                          item.price > 0
                            ? esc(
                                money(
                                  item.price
                                )
                              )
                            : `${number(
                                item.views
                              )} views`
                        }
                      </strong>
                    </div>
                  `
                )
                .join('')
            : `
                <div class="empty">
                  <i class="fa-solid fa-box-open"></i>
                  <span>
                    Belum ada konten.
                  </span>
                </div>
              `;
      }

      renderPager(
        'recentPagination',
        recentPage,
        totalPages,
        (page) => {
          recentPage = page;
          renderRecent();
        }
      );
    };

    renderRecent();

    /* =====================================================
       ACTIVITY
       ===================================================== */

    const activityEvents =
      scopedEvents.map(
        (event) => ({
          type:
            normalize(
              event.event_type
            ) ||
            'activity',

          date:
            event.created_at
        })
      );

    const orderActivities =
      scopedOrders.map(
        (order) => ({
          type:
            'paid',

          date:
            order.paid_at ||
            order.created_at
        })
      );

    const transactionActivities =
      scopedDirectTransactions.map(
        (transaction) => ({
          type:
            'sale',

          date:
            transaction.created_at
        })
      );

    const activities = [
      ...activityEvents,
      ...orderActivities,
      ...transactionActivities
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(a.date)
            ?.getTime() || 0;

        const dateB =
          safeDate(b.date)
            ?.getTime() || 0;

        return dateB - dateA;
      }
    );

    const activityIcon = (
      type
    ) => {
      switch (
        normalize(type)
      ) {
        case 'view':
          return 'fa-eye';

        case 'like':
          return 'fa-heart';

        case 'share':
          return 'fa-share-nodes';

        case 'follow':
          return 'fa-user-plus';

        case 'paid':
        case 'sale':
          return 'fa-cart-shopping';

        case 'click':
          return 'fa-arrow-pointer';

        case 'download':
          return 'fa-download';

        case 'purchase':
          return 'fa-bag-shopping';

        default:
          return 'fa-bolt';
      }
    };

    const activityLabel = (
      type
    ) => {
      switch (
        normalize(type)
      ) {
        case 'view':
          return 'VIEW';

        case 'like':
          return 'LIKE';

        case 'share':
          return 'SHARE';

        case 'follow':
          return 'FOLLOW';

        case 'paid':
          return 'PAID';

        case 'sale':
          return 'SALE';

        case 'click':
          return 'CLICK';

        case 'download':
          return 'DOWNLOAD';

        case 'purchase':
          return 'PURCHASE';

        default:
          return String(
            type ||
            'ACTIVITY'
          ).toUpperCase();
      }
    };

    const activityPageSize = 5;

    let activityPage = 1;

    const renderActivity = () => {
      const totalPages =
        Math.max(
          1,
          Math.ceil(
            activities.length /
            activityPageSize
          )
        );

      activityPage =
        Math.min(
          activityPage,
          totalPages
        );

      const start =
        (
          activityPage - 1
        ) * activityPageSize;

      const rows =
        activities.slice(
          start,
          start + activityPageSize
        );

      if ($('activity')) {
        $('activity').innerHTML =
          rows.length
            ? rows
                .map(
                  (item) => `
                    <div class="activity-row">
                      <span>
                        <i
                          class="fa-solid ${esc(
                            activityIcon(
                              item.type
                            )
                          )}"
                          aria-hidden="true"
                        ></i>
                      </span>

                      <div>
                        <b>
                          ${esc(
                            activityLabel(
                              item.type
                            )
                          )}
                        </b>

                        <small>
                          ${esc(
                            formatDateTime(
                              item.date
                            )
                          )}
                        </small>
                      </div>
                    </div>
                  `
                )
                .join('')
            : `
                <div class="empty">
                  <i class="fa-solid fa-clock"></i>
                  <span>
                    Belum ada aktivitas.
                  </span>
                </div>
              `;
      }

      renderPager(
        'activityPagination',
        activityPage,
        totalPages,
        (page) => {
          activityPage = page;
          renderActivity();
        }
      );
    };

    renderActivity();

    /* =====================================================
       PERFORMANCE CLICK
       ===================================================== */

    document
      .querySelectorAll(
        '[data-performance]'
      )
      .forEach(
        (element) => {
          /*
           * Hindari listener dobel ketika
           * scope berubah dan load() dipanggil lagi.
           */

          if (
            element.dataset.dashboardBound ===
            'true'
          ) {
            return;
          }

          element.dataset.dashboardBound =
            'true';

          element.addEventListener(
            'click',
            () => {
              const key =
                element.dataset.performance;

              const item =
                performanceSnapshot[
                  key
                ];

              if (!item) {
                return;
              }

              const value =
                key === 'revenue'
                  ? money(
                      item.value
                    )
                  : number(
                      item.value
                    );

              toast(
                `${item.label}: ${value} · Performa ${item.trend?.label || '0%'}`,
                item.trend?.direction ===
                  'down'
                  ? 'error'
                  : 'success'
              );
            }
          );
        }
      );
  }

  /* =======================================================
     SCOPE CHANGE
     ======================================================= */

  const scopeElement =
    $('scope');

  if (scopeElement) {
    scopeElement.addEventListener(
      'change',
      async () => {
        try {
          await load();
        } catch (error) {
          console.error(
            'Dashboard scope error:',
            error
          );

          toast(
            error?.message ||
              'Dashboard gagal dimuat.',
            'error'
          );
        }
      }
    );
  }

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  try {
    await load();
  } catch (error) {
    console.error(
      'Dashboard load error:',
      error
    );

    if ($('created')) {
      $('created').textContent = '0';
    }

    if ($('views')) {
      $('views').textContent = '0';
    }

    if ($('sales')) {
      $('sales').textContent = '0';
    }

    if ($('revenue')) {
      $('revenue').textContent =
        money(0);
    }

    if ($('recentLinks')) {
      $('recentLinks').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            Dashboard gagal dimuat.
          </span>
        </div>
      `;
    }

    if ($('activity')) {
      $('activity').innerHTML = `
        <div class="empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>
            ${esc(
              error?.message ||
              'Terjadi kesalahan saat mengambil data.'
            )}
          </span>
        </div>
      `;
    }

    toast(
      error?.message ||
        'Dashboard gagal dimuat.',
      'error'
    );
  }
});
