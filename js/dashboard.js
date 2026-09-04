/* =========================================================
   PasTele — DASHBOARD
   SOURCE: /js/dashboard.js
   VERSION: 2026-09-04
   Clean / Real Supabase Data / 7-Day Analytics
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  /* =======================================================
     HELPERS
     ======================================================= */
  const $ = (id) => document.getElementById(id);
  const esc =
    typeof TC?.esc === 'function'
      ? TC.esc
      : (value) =>
          String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
  const number = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('id-ID');
  };
  const money = (value) => {
    const n = Number(value || 0);
    if (typeof TC?.money === 'function') {
      return TC.money(n);
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(n);
  };
  const safeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : date;
  };
  /* =======================================================
     AUTH
     ======================================================= */
  let user;
  try {
    user = await TC.user();
  } catch (error) {
    console.error('Auth error:', error);
    location.replace('login.html');
    return;
  }
  if (!user) {
    location.replace('login.html');
    return;
  }
  /* =======================================================
     DATE HELPERS
     ======================================================= */
  const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const addDays = (value, amount) => {
    const date = new Date(value);
    date.setDate(date.getDate() + amount);
    return date;
  };
  /*
   * Local date key.
   *
   * Jangan menggunakan:
   * date.toISOString().slice(0, 10)
   *
   * untuk grouping harian karena dapat bergeser
   * satu hari akibat timezone.
   */
  const dateKey = (value) => {
    const date =
      value instanceof Date
        ? value
        : new Date(value);
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = startOfDay(new Date());
  /*
   * CURRENT:
   * hari ini + 6 hari sebelumnya
   *
   * PREVIOUS:
   * 7 hari sebelum current
   */
  const currentStart =
    addDays(today, -6);
  const previousStart =
    addDays(today, -13);
  /*
   * Supabase menerima timestamp UTC.
   * Local midnight dikonversi ke ISO dengan benar.
   */
  const queryStart =
    previousStart.toISOString();
  const currentDays =
    Array.from(
      { length: 7 },
      (_, index) =>
        addDays(currentStart, index)
    );
  const previousDays =
    Array.from(
      { length: 7 },
      (_, index) =>
        addDays(previousStart, index)
    );
  const currentDayKeys =
    new Set(
      currentDays.map(dateKey)
    );
  const previousDayKeys =
    new Set(
      previousDays.map(dateKey)
    );
  const formatDay = (date) => {
    return date.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }
    );
  };
  const formatDate = (value) => {
    const date = safeDate(value);
    if (!date) return '-';
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
    if (!date) return '-';
    return date.toLocaleString(
      'id-ID'
    );
  };
  /* =======================================================
     SCOPE
     ======================================================= */
  const getScope = () => {
    return $('scope')?.value || 'all';
  };
  const normalize = (value) => {
    return String(
      value || ''
    )
      .trim()
      .toLowerCase();
  };
  /*
   * Product scope.
   */
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
  /*
   * Analytics event scope.
   */
  const matchEvent = (
    event,
    scope
  ) => {
    if (scope === 'all') {
      return true;
    }
    const targetType =
      normalize(
        event?.target_type
      );
    if (scope === 'paste') {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(targetType);
    }
    if (scope === 'code') {
      return targetType === 'code';
    }
    if (scope === 'channel') {
      return targetType === 'channel';
    }
    if (scope === 'group') {
      return targetType === 'group';
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
    /*
     * Keduanya kosong.
     */
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
    /*
     * Sebelumnya 0 tetapi sekarang ada data.
     *
     * Tidak menyebut infinite%.
     * Kita tampilkan +100% agar UI tetap
     * masuk akal dan tidak rusak.
     */
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
        (currentValue - previousValue) /
        previousValue
      ) *
      100;
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
    const element = $(elementId);
    if (!element) {
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
            Number(
              item.views || 0
            ),
            Number(
              item.sales || 0
            ),
            Number(
              item.share || 0
            )
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
              share: 0
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
  };
  /* =======================================================
     MAIN LOAD
     ======================================================= */
  async function load() {
    const scope =
      getScope();
    /*
     * -------------------------------------------------------
     * DATABASE REQUESTS
     * -------------------------------------------------------
     */
    const [
      productsResult,
      pastesResult,
      codesResult,
      channelsResult,
      ordersResult,
      transactionsResult,
      eventsResult,
      likesResult,
      followsResult
    ] = await Promise.all([
      sb
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
        ),
      sb
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
        ),
      sb
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
        ),
      sb
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
        ),
      sb
        .from('orders')
        .select(
          'id,amount,status,created_at'
        )
        .eq(
          'seller_id',
          user.id
        )
        .eq(
          'status',
          'paid'
        )
        .gte(
          'created_at',
          queryStart
        ),
      sb
        .from('transactions')
        .select(
          [
            'id',
            'amount',
            'net_amount',
            'type',
            'status',
            'created_at'
          ].join(',')
        )
        .eq(
          'user_id',
          user.id
        )
        .gte(
          'created_at',
          queryStart
        ),
      sb
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
        ),
      sb
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
      sb
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
    const results = [
      productsResult,
      pastesResult,
      codesResult,
      channelsResult,
      ordersResult,
      transactionsResult,
      eventsResult,
      likesResult,
      followsResult
    ];
    const firstError =
      results.find(
        (result) =>
          result?.error
      );
    if (firstError?.error) {
      throw firstError.error;
    }
    /* =====================================================
       NORMALIZE
       ===================================================== */
    const products =
      productsResult.data || [];
    const pastes =
      pastesResult.data || [];
    const codes =
      codesResult.data || [];
    const channels =
      channelsResult.data || [];
    const orders =
      ordersResult.data || [];
    const transactions =
      transactionsResult.data || [];
    const allEvents =
      eventsResult.data || [];
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
      scope === 'all' ||
      scope === 'paste'
        ? pastes
        : [];
    /*
     * telegram_products memakai product_type.
     *
     * Jangan otomatis menganggap semua telegram_products
     * sebagai "code" apabila database bisa mempunyai
     * tipe lain.
     */
    const filteredCodes =
      scope === 'all' ||
      scope === 'code'
        ? codes.filter(
            (item) => {
              if (
                scope === 'all'
              ) {
                return true;
              }
              return [
                'code',
                'product',
                'file'
              ].includes(
                normalize(
                  item.product_type
                )
              );
            }
          )
        : [];
    const filteredChannels =
      scope === 'all'
        ? channels
        : channels.filter(
            (item) =>
              normalize(
                item.type
              ) === scope
          );
    /* =====================================================
       SCOPED EVENTS
       ===================================================== */
    const scopedEvents =
      allEvents.filter(
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
       TOTAL VIEWS
       ===================================================== */
    /*
     * products.views dan pastelinks.views adalah
     * cumulative counter.
     *
     * analytics_events adalah event history.
     *
     * Untuk total dashboard kita mengambil nilai terbesar
     * agar tidak menampilkan angka event yang lebih kecil
     * dari counter database.
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
    const eventViews =
      scopedEvents.filter(
        (event) =>
          normalize(
            event.event_type
          ) === 'view'
      ).length;
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
       VALID SELL TRANSACTIONS
       ===================================================== */
    const validSellTransactions =
      transactions.filter(
        (item) => {
          const type =
            normalize(
              item.type
            );
          const status =
            normalize(
              item.status
            );
          return (
            /^sell_/i.test(type) &&
            [
              'completed',
              'paid',
              'success'
            ].includes(status)
          );
        }
      );
    /* =====================================================
       SALES
       ===================================================== */
    /*
     * IMPORTANT:
     *
     * analytics_events.type = paid
     * TIDAK dihitung sebagai sale.
     *
     * Sumber financial:
     * 1. orders
     * 2. sell_* transactions
     *
     * Dengan begitu event paid tidak menyebabkan
     * double-count dengan transaksi.
     */
    const totalSales =
      orders.length +
      validSellTransactions.length;
    if ($('sales')) {
      $('sales').textContent =
        number(totalSales);
    }
    if ($('detailSales')) {
      $('detailSales').textContent =
        number(totalSales);
    }
    /* =====================================================
       REVENUE
       ===================================================== */
    const orderRevenue =
      orders.reduce(
        (total, order) =>
          total +
          Number(
            order.amount || 0
          ),
        0
      );
    const transactionRevenue =
      validSellTransactions.reduce(
        (
          total,
          transaction
        ) =>
          total +
          Number(
            transaction.net_amount ??
            transaction.amount ??
            0
          ),
        0
      );
    const totalRevenue =
      orderRevenue +
      transactionRevenue;
    if ($('revenue')) {
      $('revenue').textContent =
        money(totalRevenue);
    }
    if ($('detailRevenue')) {
      $('detailRevenue').textContent =
        money(totalRevenue);
    }
    /* =====================================================
       CONTENT COUNTERS
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
      codes.length;
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
      const interactionItems = [
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
        interactionItems
          .map(
            (item) => `
              <div
                class="circle-stat ${esc(
                  item.color
                )}"
              >
                <div class="circle">
                  <i
                    class="fa-solid ${esc(
                      item.icon
                    )}"
                    aria-hidden="true"
                  ></i>
                </div>
                <strong>
                  ${number(
                    item.value
                  )}
                </strong>
                <span>
                  ${esc(
                    item.label
                  )}
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
    /* -----------------------------------------------------
       EVENTS
       ----------------------------------------------------- */
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
      if (
        !currentDayKeys.has(key)
      ) {
        continue;
      }
      const type =
        normalize(
          event.event_type
        );
      if (type === 'view') {
        chartData[key].views++;
      }
      if (type === 'share') {
        chartData[key].share++;
      }
      /*
       * paid event sengaja tidak dimasukkan.
       *
       * Sales berasal dari orders + transactions.
       */
    }
    /* -----------------------------------------------------
       CURRENT ORDERS
       ----------------------------------------------------- */
    for (
      const order of orders
    ) {
      const date =
        safeDate(
          order.created_at
        );
      if (!date) {
        continue;
      }
      const key =
        dateKey(date);
      if (
        !currentDayKeys.has(key)
      ) {
        continue;
      }
      chartData[key].sales++;
      chartData[key].revenue +=
        Number(
          order.amount || 0
        );
    }
    /* -----------------------------------------------------
       CURRENT SELL TRANSACTIONS
       ----------------------------------------------------- */
    for (
      const transaction of
        validSellTransactions
    ) {
      const date =
        safeDate(
          transaction.created_at
        );
      if (!date) {
        continue;
      }
      const key =
        dateKey(date);
      if (
        !currentDayKeys.has(key)
      ) {
        continue;
      }
      chartData[key].sales++;
      chartData[key].revenue +=
        Number(
          transaction.net_amount ??
          transaction.amount ??
          0
        );
    }
    /* =====================================================
       PREVIOUS 7 DAYS
       ===================================================== */
    const previousData = {
      views: 0,
      sales: 0,
      revenue: 0
    };
    /* -----------------------------------------------------
       PREVIOUS EVENT METRICS
       ----------------------------------------------------- */
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
      if (
        !previousDayKeys.has(key)
      ) {
        continue;
      }
      const type =
        normalize(
          event.event_type
        );
      if (type === 'view') {
        previousData.views++;
      }
      /*
       * paid event tidak dihitung sebagai sales.
       */
    }
    /* -----------------------------------------------------
       PREVIOUS ORDERS
       ----------------------------------------------------- */
    for (
      const order of orders
    ) {
      const date =
        safeDate(
          order.created_at
        );
      if (!date) {
        continue;
      }
      const key =
        dateKey(date);
      if (
        !previousDayKeys.has(key)
      ) {
        continue;
      }
      previousData.sales++;
      previousData.revenue +=
        Number(
          order.amount || 0
        );
    }
    /* -----------------------------------------------------
       PREVIOUS SELL TRANSACTIONS
       ----------------------------------------------------- */
    for (
      const transaction of
        validSellTransactions
    ) {
      const date =
        safeDate(
          transaction.created_at
        );
      if (!date) {
        continue;
      }
      const key =
        dateKey(date);
      if (
        !previousDayKeys.has(key)
      ) {
        continue;
      }
      previousData.sales++;
      previousData.revenue +=
        Number(
          transaction.net_amount ??
          transaction.amount ??
          0
        );
    }
    /* =====================================================
       CURRENT PERIOD
       ===================================================== */
    const currentData = {
      views: 0,
      sales: 0,
      revenue: 0
    };
    currentDays.forEach(
      (day) => {
        const item =
          chartData[
            dateKey(day)
          ];
        currentData.views +=
          Number(
            item?.views || 0
          );
        currentData.sales +=
          Number(
            item?.sales || 0
          );
        currentData.revenue +=
          Number(
            item?.revenue || 0
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
    const revenueTrend =
      calculateTrend(
        currentData.revenue,
        previousData.revenue
      );
    /*
     * Old / alternative IDs.
     */
    [
      ['viewsTrend', viewsTrend],
      ['salesTrend', salesTrend],
      ['revenueTrend', revenueTrend],
      ['viewsChange', viewsTrend],
      ['salesChange', salesTrend],
      ['revenueChange', revenueTrend],
      [
        'performanceViewsTrend',
        viewsTrend
      ],
      [
        'performanceSalesTrend',
        salesTrend
      ],
      [
        'performanceRevenueTrend',
        revenueTrend
      ]
    ].forEach(
      ([id, trend]) => {
        if ($(id)) {
          renderTrend(
            id,
            trend
          );
        }
      }
    );
    /* =====================================================
       PERFORMANCE SUMMARY
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
    const periodLabel =
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
    if ($('performancePeriod')) {
      $('performancePeriod').textContent =
        periodLabel;
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
    if (
      performanceMeta
    ) {
      const comparisonText =
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
      const firstMeta =
        performanceMeta.querySelector(
          '.performance-meta-item span'
        );
      if (firstMeta) {
        firstMeta.textContent =
          comparisonText;
      }
    }
    /* =====================================================
       CHART
       ===================================================== */
    renderChart(
      chartData
    );
    /* =====================================================
       RECENT CONTENT
       ===================================================== */
    const recentProducts =
      filteredProducts.map(
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
      );
    const recentPastes =
      filteredPastes.map(
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
      );
    const recentCodes =
      filteredCodes.map(
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
      );
    const recentChannels =
      filteredChannels.map(
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
      );
    const recentRows = [
      ...recentProducts,
      ...recentPastes,
      ...recentCodes,
      ...recentChannels
    ]
      .sort(
        (a, b) => {
          const dateA =
            safeDate(a.date)
              ?.getTime() || 0;
          const dateB =
            safeDate(b.date)
              ?.getTime() || 0;
          return dateB - dateA;
        }
      )
      .slice(0, 8);
    if ($('recentLinks')) {
      $('recentLinks').innerHTML =
        recentRows.length
          ? recentRows
              .map(
                (item) => `
                  <div class="recent-item">
                    <span class="recent-icon">
                      <i
                        class="fa-solid ${esc(
                          item.icon
                        )}"
                        aria-hidden="true"
                      ></i>
                    </span>
                    <div>
                      <b>
                        ${esc(
                          item.title
                        )}
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
                Belum ada konten.
              </div>
            `;
    }
    /* =====================================================
       ACTIVITY
       ===================================================== */
    const activityEvents =
      scopedEvents.map(
        (event) => ({
          type:
            normalize(
              event.event_type
            ) || 'activity',
          date:
            event.created_at
        })
      );
    const orderActivities =
      orders.map(
        (order) => ({
          type:
            'paid',
          date:
            order.created_at
        })
      );
    /*
     * Sell transactions juga ditampilkan sebagai
     * aktivitas financial.
     */
    const transactionActivities =
      validSellTransactions.map(
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
    ]
      .sort(
        (a, b) => {
          const dateA =
            safeDate(a.date)
              ?.getTime() || 0;
          const dateB =
            safeDate(b.date)
              ?.getTime() || 0;
          return dateB - dateA;
        }
      )
      .slice(0, 8);
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
    if ($('activity')) {
      $('activity').innerHTML =
        activities.length
          ? activities
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
                          String(
                            item.type ||
                            'activity'
                          ).toUpperCase()
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
                Belum ada aktivitas.
              </div>
            `;
    }
    /* =====================================================
       GREETING
       ===================================================== */
    if ($('helloName')) {
      $('helloName').textContent =
        user.user_metadata?.username ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';
    }
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
          if (
            typeof TC?.toast ===
            'function'
          ) {
            TC.toast(
              error?.message ||
                'Dashboard gagal dimuat',
              'error'
            );
          }
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
    if (
      typeof TC?.toast ===
      'function'
    ) {
      TC.toast(
        error?.message ||
          'Dashboard gagal dimuat',
        'error'
      );
    }
  }
});
