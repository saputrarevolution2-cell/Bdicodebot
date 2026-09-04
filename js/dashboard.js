/* =========================================================
   PasTele Dashboard
   SOURCE: /js/dashboard.js?v=20260904
   Full clean version
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = TC.esc;
  /* =======================================================
     AUTH
     ======================================================= */
  const u = await TC.user();
  if (!u) {
    location.replace('login.html');
    return;
  }
  /* =======================================================
     DATE HELPERS
     ======================================================= */
  const now = new Date();
  // Gunakan tanggal lokal agar tidak bergeser karena UTC.
  const dateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const addDays = (date, amount) => {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
  };
  const today = startOfDay(now);
  /*
   * Performa:
   * - current: 7 hari terakhir, termasuk hari ini
   * - previous: 7 hari sebelum current
   */
  const currentStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  /*
   * Query harus mengambil sejak awal periode sebelumnya.
   */
  const queryStart = previousStart.toISOString();
  const currentDays = Array.from(
    { length: 7 },
    (_, index) => addDays(currentStart, index)
  );
  const previousDays = Array.from(
    { length: 7 },
    (_, index) => addDays(previousStart, index)
  );
  /* =======================================================
     FORMATTERS
     ======================================================= */
  const number = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString('id-ID');
  };
  const money = (value) => {
    return TC.money(Number(value || 0));
  };
  const formatDay = (date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };
  const safeDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  /* =======================================================
     SCOPE
     ======================================================= */
  const getScope = () => {
    return $('scope')?.value || 'all';
  };
  const matchProductType = (type, scope) => {
    const normalized = String(type || 'link').toLowerCase();
    if (scope === 'all') return true;
    if (scope === 'paste') return normalized === 'link' || normalized === 'paste';
    return normalized === scope;
  };
  const matchEvent = (event, scope) => {
    const eventType = String(event?.target_type || '').toLowerCase();
    if (scope === 'all') return true;
    if (scope === 'paste') {
      return ['link', 'pastelink', 'paste'].includes(eventType);
    }
    if (scope === 'code') {
      return eventType === 'code';
    }
    if (scope === 'channel') {
      return eventType === 'channel';
    }
    if (scope === 'group') {
      return eventType === 'group';
    }
    return false;
  };
  /* =======================================================
     TREND CALCULATION
     ======================================================= */
  const calculateTrend = (current, previous) => {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (previousValue === 0 && currentValue === 0) {
      return {
        percent: 0,
        direction: 'stable',
        icon: 'fa-minus',
        label: '0%'
      };
    }
    if (previousValue === 0) {
      return {
        percent: 100,
        direction: 'up',
        icon: 'fa-arrow-trend-up',
        label: '+100%'
      };
    }
    const percent =
      ((currentValue - previousValue) / previousValue) * 100;
    const rounded = Math.abs(percent).toFixed(1);
    if (percent > 0) {
      return {
        percent,
        direction: 'up',
        icon: 'fa-arrow-trend-up',
        label: `+${rounded}%`
      };
    }
    if (percent < 0) {
      return {
        percent,
        direction: 'down',
        icon: 'fa-arrow-trend-down',
        label: `-${rounded}%`
      };
    }
    return {
      percent: 0,
      direction: 'stable',
      icon: 'fa-minus',
      label: '0%'
    };
  };
  /* =======================================================
     TREND UI
     ======================================================= */
  const renderTrend = (elementId, trend) => {
    const el = $(elementId);
    if (!el) return;
    el.className = `trend trend-${trend.direction}`;
    el.innerHTML = `
      <i class="fa-solid ${trend.icon}" aria-hidden="true"></i>
      <span>${esc(trend.label)}</span>
    `;
  };
  /*
   * Kalau HTML belum mempunyai element trend,
   * function ini tidak error.
   */
  const renderOptionalTrend = (id, trend) => {
    if ($(id)) {
      renderTrend(id, trend);
    }
  };
  /* =======================================================
     CHART
     ======================================================= */
  const renderChart = (chartData) => {
    const chart = $('chart');
    if (!chart) return;
    const max = Math.max(
      1,
      ...currentDays.map((day) => {
        const item = chartData[dateKey(day)];
        return Math.max(
          Number(item?.views || 0),
          Number(item?.sales || 0),
          Number(item?.share || 0)
        );
      })
    );
    chart.innerHTML = currentDays
      .map((day) => {
        const key = dateKey(day);
        const item = chartData[key] || {
          views: 0,
          sales: 0,
          share: 0
        };
        const viewsHeight =
          item.views > 0
            ? Math.max(3, (item.views / max) * 100)
            : 2;
        const salesHeight =
          item.sales > 0
            ? Math.max(3, (item.sales / max) * 100)
            : 2;
        const shareHeight =
          item.share > 0
            ? Math.max(3, (item.share / max) * 100)
            : 2;
        return `
          <div
            class="chart-day"
            data-date="${esc(key)}"
            title="${esc(
              `${formatDay(day)} — Views ${number(item.views)}, Sales ${number(item.sales)}, Share ${number(item.share)}`
            )}"
          >
            <div class="bars">
              <i
                class="bar-views"
                style="height:${viewsHeight}%"
                title="Views: ${number(item.views)}"
              ></i>
              <i
                class="bar-sales"
                style="height:${salesHeight}%"
                title="Sales: ${number(item.sales)}"
              ></i>
              <i
                class="bar-share"
                style="height:${shareHeight}%"
                title="Share: ${number(item.share)}"
              ></i>
            </div>
            <small>${esc(formatDay(day))}</small>
          </div>
        `;
      })
      .join('');
  };
  /* =======================================================
     MAIN LOAD
     ======================================================= */
  async function load() {
    const scope = getScope();
    /*
     * Ambil semua data yang diperlukan.
     *
     * orders + transactions:
     * periode previous + current
     *
     * analytics_events:
     * diambil semua karena existing dashboard juga
     * menggunakan total event.
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
          'id,title,type,views,sales_count,price,created_at,status'
        )
        .eq('creator_id', u.id)
        .order('created_at', { ascending: false }),
      sb
        .from('pastelinks')
        .select('id,slug,title,views,created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false }),
      sb
        .from('telegram_products')
        .select(
          'id,title,product_type,access_type,price,is_published,created_at'
        )
        .eq('owner_id', u.id)
        .order('created_at', { ascending: false }),
      sb
        .from('telegram_channels')
        .select(
          'id,name,type,access_type,price,is_published,created_at'
        )
        .eq('owner_id', u.id)
        .order('created_at', { ascending: false }),
      sb
        .from('orders')
        .select('id,amount,status,created_at')
        .eq('seller_id', u.id)
        .eq('status', 'paid')
        .gte('created_at', queryStart),
      sb
        .from('transactions')
        .select(
          'id,amount,net_amount,type,status,created_at'
        )
        .eq('user_id', u.id)
        .gte('created_at', queryStart),
      sb
        .from('analytics_events')
        .select(
          'event_type,target_type,target_id,created_at'
        )
        .eq('owner_id', u.id),
      sb
        .from('content_likes')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('content_owner_id', u.id),
      sb
        .from('creator_followers')
        .select('id', {
          count: 'exact',
          head: true
        })
        .eq('creator_id', u.id)
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
    const firstError = results.find((result) => result?.error);
    if (firstError?.error) {
      throw firstError.error;
    }
    /* =====================================================
       NORMALIZE DATA
       ===================================================== */
    const products = productsResult.data || [];
    const pastes = pastesResult.data || [];
    const codes = codesResult.data || [];
    const channels = channelsResult.data || [];
    const orders = ordersResult.data || [];
    const transactions = transactionsResult.data || [];
    const allEvents = eventsResult.data || [];
    /* =====================================================
       FILTER BY SCOPE
       ===================================================== */
    const filteredProducts = products.filter((item) =>
      matchProductType(item.type, scope)
    );
    const filteredPastes =
      scope === 'all' || scope === 'paste'
        ? pastes
        : [];
    const filteredCodes =
      scope === 'all' || scope === 'code'
        ? codes
        : [];
    const filteredChannels =
      scope === 'all' ||
      scope === 'channel' ||
      scope === 'group'
        ? channels.filter(
            (item) =>
              scope === 'all' ||
              String(item.type || '').toLowerCase() === scope
          )
        : [];
    const scopedEvents = allEvents.filter((event) =>
      matchEvent(event, scope)
    );
    /* =====================================================
       CREATED CONTENT
       ===================================================== */
    const createdCount =
      filteredProducts.length +
      filteredPastes.length +
      filteredCodes.length +
      filteredChannels.length;
    if ($('created')) {
      $('created').textContent = number(createdCount);
    }
    /* =====================================================
       TOTAL VIEWS
       ===================================================== */
    const storedViews =
      filteredProducts.reduce(
        (total, item) =>
          total + Number(item.views || 0),
        0
      ) +
      filteredPastes.reduce(
        (total, item) =>
          total + Number(item.views || 0),
        0
      );
    const eventViews = scopedEvents.filter(
      (event) =>
        String(event.event_type).toLowerCase() === 'view'
    ).length;
    const views = Math.max(
      storedViews,
      eventViews
    );
    if ($('views')) {
      $('views').textContent = number(views);
    }
    /* =====================================================
       SALES / TRANSACTIONS
       ===================================================== */
    const validSellTransactions = transactions.filter(
      (item) =>
        /^sell_/i.test(String(item.type || '')) &&
        ['completed', 'paid', 'success'].includes(
          String(item.status || '').toLowerCase()
        )
    );
    const sales = orders.length + validSellTransactions.length;
    if ($('sales')) {
      $('sales').textContent = number(sales);
    }
    /* =====================================================
       REVENUE
       ===================================================== */
    const orderRevenue = orders.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );
    const transactionRevenue =
      validSellTransactions.reduce(
        (total, item) =>
          total +
          Number(
            item.net_amount ??
            item.amount ??
            0
          ),
        0
      );
    const revenue =
      orderRevenue +
      transactionRevenue;
    if ($('revenue')) {
      $('revenue').textContent = money(revenue);
    }
    /* =====================================================
       CONTENT COUNTERS
       ===================================================== */
    const totalLink =
      products.filter((item) =>
        ['link', 'paste', 'pastelink'].includes(
          String(item.type || '').toLowerCase()
        )
      ).length +
      pastes.length;
    const totalCode = codes.length;
    const totalChannel = channels.filter(
      (item) =>
        String(item.type || '').toLowerCase() === 'channel'
    ).length;
    if ($('totalLink')) {
      $('totalLink').textContent = number(totalLink);
    }
    if ($('totalCode')) {
      $('totalCode').textContent = number(totalCode);
    }
    if ($('totalChannel')) {
      $('totalChannel').textContent = number(totalChannel);
    }
    /* =====================================================
       INTERACTIONS
       ===================================================== */
    const countEvent = (type) =>
      scopedEvents.filter(
        (event) =>
          String(event.event_type || '').toLowerCase() ===
          type
      ).length;
    if ($('interactions')) {
      const interactionItems = [
        [
          'fa-eye',
          'Views',
          views,
          'blue'
        ],
        [
          'fa-heart',
          'Like',
          likesResult.count || 0,
          'pink'
        ],
        [
          'fa-share-nodes',
          'Share',
          countEvent('share'),
          'violet'
        ],
        [
          'fa-user-plus',
          'Follower',
          followsResult.count || 0,
          'green'
        ]
      ];
      $('interactions').innerHTML =
        interactionItems
          .map(
            (item) => `
              <div class="circle-stat ${esc(item[3])}">
                <div class="circle">
                  <i
                    class="fa-solid ${esc(item[0])}"
                    aria-hidden="true"
                  ></i>
                </div>
                <strong>${number(item[2])}</strong>
                <span>${esc(item[1])}</span>
              </div>
            `
          )
          .join('');
    }
    /* =====================================================
       7 DAY PERFORMANCE DATA
       ===================================================== */
    const chartData = {};
    currentDays.forEach((day) => {
      chartData[dateKey(day)] = {
        views: 0,
        sales: 0,
        share: 0,
        revenue: 0
      };
    });
    /* -----------------------------------------------------
       Current 7 days events
       ----------------------------------------------------- */
    for (const event of scopedEvents) {
      const eventDate = safeDate(event.created_at);
      if (!eventDate) continue;
      const key = dateKey(eventDate);
      if (!chartData[key]) continue;
      const type = String(
        event.event_type || ''
      ).toLowerCase();
      if (type === 'view') {
        chartData[key].views++;
      }
      if (type === 'share') {
        chartData[key].share++;
      }
      /*
       * Event paid dihitung sebagai sale hanya jika
       * memang ada event paid.
       */
      if (type === 'paid') {
        chartData[key].sales++;
      }
    }
    /* -----------------------------------------------------
       Current orders
       ----------------------------------------------------- */
    for (const order of orders) {
      const orderDate = safeDate(order.created_at);
      if (!orderDate) continue;
      const key = dateKey(orderDate);
      if (!chartData[key]) continue;
      chartData[key].sales++;
      chartData[key].revenue += Number(
        order.amount || 0
      );
    }
    /* -----------------------------------------------------
       Current sell transactions
       ----------------------------------------------------- */
    for (const transaction of validSellTransactions) {
      const transactionDate = safeDate(
        transaction.created_at
      );
      if (!transactionDate) continue;
      const key = dateKey(transactionDate);
      if (!chartData[key]) continue;
      /*
       * Jangan menganggap transaction yang sama
       * sebagai event paid + transaction jika event
       * paid berasal dari transaksi yang sama.
       *
       * Existing system sebelumnya menghitung keduanya.
       * Di sini transaksi tetap dianggap sebagai sale
       * karena merupakan sumber transaksi finansial.
       */
      chartData[key].sales++;
      chartData[key].revenue += Number(
        transaction.net_amount ??
        transaction.amount ??
        0
      );
    }
    /* =====================================================
       PREVIOUS 7 DAYS CALCULATION
       ===================================================== */
    const previousData = {
      views: 0,
      sales: 0,
      revenue: 0
    };
    /*
     * Previous event metrics
     */
    for (const event of scopedEvents) {
      const eventDate = safeDate(event.created_at);
      if (!eventDate) continue;
      const key = dateKey(eventDate);
      const belongsToPrevious =
        previousDays.some(
          (day) => dateKey(day) === key
        );
      if (!belongsToPrevious) continue;
      const type = String(
        event.event_type || ''
      ).toLowerCase();
      if (type === 'view') {
        previousData.views++;
      }
      if (type === 'paid') {
        previousData.sales++;
      }
    }
    /*
     * Previous orders
     */
    for (const order of orders) {
      const orderDate = safeDate(order.created_at);
      if (!orderDate) continue;
      const key = dateKey(orderDate);
      const belongsToPrevious =
        previousDays.some(
          (day) => dateKey(day) === key
        );
      if (!belongsToPrevious) continue;
      previousData.sales++;
      previousData.revenue += Number(
        order.amount || 0
      );
    }
    /*
     * Previous transactions
     */
    for (const transaction of validSellTransactions) {
      const transactionDate = safeDate(
        transaction.created_at
      );
      if (!transactionDate) continue;
      const key = dateKey(transactionDate);
      const belongsToPrevious =
        previousDays.some(
          (day) => dateKey(day) === key
        );
      if (!belongsToPrevious) continue;
      previousData.sales++;
      previousData.revenue += Number(
        transaction.net_amount ??
        transaction.amount ??
        0
      );
    }
    /* =====================================================
       CURRENT PERIOD TOTALS
       ===================================================== */
    const currentData = {
      views: currentDays.reduce(
        (total, day) =>
          total +
          Number(
            chartData[dateKey(day)]?.views || 0
          ),
        0
      ),
      sales: currentDays.reduce(
        (total, day) =>
          total +
          Number(
            chartData[dateKey(day)]?.sales || 0
          ),
        0
      ),
      revenue: currentDays.reduce(
        (total, day) =>
          total +
          Number(
            chartData[dateKey(day)]?.revenue || 0
          ),
        0
      )
    };
    /* =====================================================
       TRENDS
       ===================================================== */
    const viewsTrend = calculateTrend(
      currentData.views,
      previousData.views
    );
    const salesTrend = calculateTrend(
      currentData.sales,
      previousData.sales
    );
    const revenueTrend = calculateTrend(
      currentData.revenue,
      previousData.revenue
    );
    /*
     * Support multiple possible IDs so HTML can be
     * connected without breaking old markup.
     */
    renderOptionalTrend(
      'viewsTrend',
      viewsTrend
    );
    renderOptionalTrend(
      'salesTrend',
      salesTrend
    );
    renderOptionalTrend(
      'revenueTrend',
      revenueTrend
    );
    renderOptionalTrend(
      'viewsChange',
      viewsTrend
    );
    renderOptionalTrend(
      'salesChange',
      salesTrend
    );
    renderOptionalTrend(
      'revenueChange',
      revenueTrend
    );
    /* =====================================================
       OPTIONAL 7 DAY SUMMARY ELEMENTS
       ===================================================== */
    if ($('performanceViews')) {
      $('performanceViews').textContent =
        number(currentData.views);
    }
    if ($('performanceSales')) {
      $('performanceSales').textContent =
        number(currentData.sales);
    }
    if ($('performanceRevenue')) {
      $('performanceRevenue').textContent =
        money(currentData.revenue);
    }
    if ($('performanceViewsTrend')) {
      renderTrend(
        'performanceViewsTrend',
        viewsTrend
      );
    }
    if ($('performanceSalesTrend')) {
      renderTrend(
        'performanceSalesTrend',
        salesTrend
      );
    }
    if ($('performanceRevenueTrend')) {
      renderTrend(
        'performanceRevenueTrend',
        revenueTrend
      );
    }
    /* =====================================================
       PERIOD LABEL
       ===================================================== */
    const periodLabel =
      `${currentDays[0].toLocaleDateString(
        'id-ID',
        {
          day: '2-digit',
          month: 'short'
        }
      )} – ${currentDays[6].toLocaleDateString(
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
       RENDER CHART
       ===================================================== */
    renderChart(chartData);
    /* =====================================================
       RECENT CONTENT
       ===================================================== */
    const rows = [
      ...products.map((item) => ({
        title: item.title,
        type: item.type,
        icon:
          String(item.type || '').toLowerCase() ===
          'code'
            ? 'fa-code'
            : 'fa-link',
        date: item.created_at,
        views: item.views || 0,
        price: item.price || 0
      })),
      ...pastes.map((item) => ({
        title:
          item.title ||
          item.slug ||
          'PasteLink',
        type: 'pastelink',
        icon: 'fa-file-lines',
        date: item.created_at,
        views: item.views || 0,
        price: 0
      })),
      ...codes.map((item) => ({
        title: item.title,
        type: 'code',
        icon: 'fa-code',
        date: item.created_at,
        views: 0,
        price: item.price || 0
      })),
      ...channels.map((item) => ({
        title:
          item.name ||
          'Channel',
        type: item.type,
        icon:
          String(item.type || '').toLowerCase() ===
          'group'
            ? 'fa-users'
            : 'fa-broadcast-tower',
        date: item.created_at,
        views: 0,
        price: item.price || 0
      }))
    ]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 8);
    if ($('recentLinks')) {
      $('recentLinks').innerHTML =
        rows
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
                  <b>${esc(
                    item.title || 'Untitled'
                  )}</b>
                  <small>
                    ${esc(
                      String(
                        item.type || 'content'
                      )
                    )}
                    ·
                    ${
                      safeDate(item.date)
                        ? safeDate(
                            item.date
                          ).toLocaleDateString(
                            'id-ID'
                          )
                        : '-'
                    }
                  </small>
                </div>
                <strong>
                  ${
                    Number(item.price || 0) > 0
                      ? money(item.price)
                      : `${number(
                          item.views
                        )} views`
                  }
                </strong>
              </div>
            `
          )
          .join('') ||
        '<div class="empty">Belum ada konten.</div>';
    }
    /* =====================================================
       ACTIVITY
       ===================================================== */
    const activityEvents = allEvents
      .filter((event) => matchEvent(event, scope))
      .map((event) => ({
        t: String(
          event.event_type || 'activity'
        ).toLowerCase(),
        d: event.created_at
      }));
    const orderActivities = orders.map(
      (order) => ({
        t: 'paid',
        d: order.created_at
      })
    );
    const activities = [
      ...activityEvents,
      ...orderActivities
    ]
      .sort(
        (a, b) =>
          new Date(b.d) -
          new Date(a.d)
      )
      .slice(0, 8);
    const activityIcon = (type) => {
      switch (type) {
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
        default:
          return 'fa-bolt';
      }
    };
    if ($('activity')) {
      $('activity').innerHTML =
        activities
          .map((item) => {
            const activityDate =
              safeDate(item.d);
            return `
              <div class="activity-row">
                <span>
                  <i
                    class="fa-solid ${activityIcon(
                      item.t
                    )}"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <b>
                    ${esc(
                      String(
                        item.t || 'activity'
                      ).toUpperCase()
                    )}
                  </b>
                  <small>
                    ${
                      activityDate
                        ? activityDate.toLocaleString(
                            'id-ID'
                          )
                        : '-'
                    }
                  </small>
                </div>
              </div>
            `;
          })
          .join('') ||
        '<div class="empty">Belum ada aktivitas.</div>';
    }
    /* =====================================================
       GREETING
       ===================================================== */
    if ($('helloName')) {
      $('helloName').textContent =
        u.user_metadata?.username ||
        u.user_metadata?.name ||
        u.email?.split('@')[0] ||
        'User';
    }
  }
  /* =======================================================
     SCOPE EVENT
     ======================================================= */
  const scopeElement = $('scope');
  if (scopeElement) {
    scopeElement.addEventListener(
      'change',
      () => {
        load().catch((error) => {
          console.error(
            'Dashboard scope error:',
            error
          );
          if (typeof TC.toast === 'function') {
            TC.toast(
              error?.message ||
                'Dashboard gagal dimuat',
              'error'
            );
          }
        });
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
    if (typeof TC.toast === 'function') {
      TC.toast(
        error?.message ||
          'Dashboard gagal dimuat',
        'error'
      );
    }
  }
});
