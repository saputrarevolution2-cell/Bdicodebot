/* ===== SOURCE: js/dashboard.js ===== */
/* =========================================================
   PasTele — DASHBOARD
   FINAL INTERACTIVE VERSION
   ---------------------------------------------------------
   Database sync:
   - products.seller_id / creator_id
   - pastes.owner_id
   - pastelinks.user_id
   - telegram_products.owner_id
   - telegram_channels.owner_id
   - orders.seller_id
   - transactions.user_id
   - analytics_events.owner_id
   - content_likes.content_owner_id
   - creator_followers.creator_id

   Semua konten Dashboard dibuat interactive:
   - Main statistics
   - Interaction statistics
   - Performance
   - Chart
   - Revenue
   - Followers
   - Detail statistics
   - Recent content
   - Activity
   - Pagination
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const main = $('dashboardMain');

  /* =======================================================
     CORE
     ======================================================= */

  const core = window.TC || {};

  const supabase =
    window.sb ||
    window.supabaseClient ||
    window.supabase;

  if (!supabase) {
    console.error(
      '[PasTele Dashboard] Supabase client tidak ditemukan.'
    );

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

  const number = (value) =>
    Number(value || 0).toLocaleString('id-ID');

  const money = (value) => {
    const n = Number(value || 0);

    if (typeof core.money === 'function') {
      return core.money(n);
    }

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(n);
  };

  const toast = (
    message,
    type = 'info'
  ) => {
    if (typeof core.toast === 'function') {
      core.toast(message, type);
      return;
    }

    const box = $('toast');

    if (!box) return;

    box.textContent = String(message || '');
    box.className = `toast toast-${type}`;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      box.textContent = '';
      box.className = 'toast';
    }, 3200);
  };

  const normalize = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase();

  const safeDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  };

  const startOfDay = (value) => {
    const date = new Date(value);

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  };

  const addDays = (
    value,
    amount
  ) => {
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

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, '0'),
      String(
        date.getDate()
      ).padStart(2, '0')
    ].join('-');
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
    const date =
      safeDate(value);

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
    const date =
      safeDate(value);

    if (!date) return '-';

    return date.toLocaleString(
      'id-ID'
    );
  };

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const go = (url) => {
    if (!url) return;

    window.location.href = url;
  };

  const makeInteractive = (
    element,
    url,
    label
  ) => {
    if (!element || !url) return;

    if (
      element.dataset.dashboardInteractive ===
      '1'
    ) {
      return;
    }

    element.dataset.dashboardInteractive = '1';

    element.dataset.dashboardHref = url;

    element.setAttribute(
      'role',
      'link'
    );

    element.setAttribute(
      'tabindex',
      '0'
    );

    if (label) {
      element.setAttribute(
        'aria-label',
        label
      );
    }

    element.addEventListener(
      'click',
      (event) => {
        /*
         * Jangan override anchor/button
         * yang memang sudah ada.
         */
        if (
          event.target.closest(
            'a,button,input,select,textarea'
          )
        ) {
          return;
        }

        go(url);
      }
    );

    element.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key !== 'Enter' &&
          event.key !== ' '
        ) {
          return;
        }

        if (
          event.target.closest(
            'a,button,input,select,textarea'
          )
        ) {
          return;
        }

        event.preventDefault();

        go(url);
      }
    );
  };

  /* =======================================================
     FETCH ALL
     ======================================================= */

  async function fetchAll(
    buildQuery,
    pageSize = 1000
  ) {
    const all = [];

    let from = 0;

    while (true) {
      const to =
        from +
        pageSize -
        1;

      const query =
        buildQuery();

      const {
        data,
        error
      } =
        await query.range(
          from,
          to
        );

      if (error) {
        throw error;
      }

      const rows =
        Array.isArray(data)
          ? data
          : [];

      all.push(...rows);

      if (
        rows.length <
        pageSize
      ) {
        break;
      }

      from +=
        pageSize;
    }

    return all;
  }

  /* =======================================================
     AUTH
     ======================================================= */

  let user = null;

  try {
    if (
      typeof core.user ===
      'function'
    ) {
      user =
        await core.user();
    } else {
      const {
        data,
        error
      } =
        await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      user =
        data?.user || null;
    }
  } catch (error) {
    console.error(
      '[PasTele Dashboard] Auth error:',
      error
    );

    location.replace(
      'login.html'
    );

    return;
  }

  if (!user) {
    location.replace(
      'login.html'
    );

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

  const today =
    startOfDay(
      new Date()
    );

  const currentStart =
    addDays(
      today,
      -6
    );

  const previousStart =
    addDays(
      today,
      -13
    );

  const currentDays =
    Array.from(
      {
        length: 7
      },
      (_, index) =>
        addDays(
          currentStart,
          index
        )
    );

  const previousDays =
    Array.from(
      {
        length: 7
      },
      (_, index) =>
        addDays(
          previousStart,
          index
        )
    );

  const currentDayKeys =
    new Set(
      currentDays.map(
        dateKey
      )
    );

  const previousDayKeys =
    new Set(
      previousDays.map(
        dateKey
      )
    );

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
    $('scope')?.value ||
    'all';

  const matchProductType = (
    type,
    scope
  ) => {
    const normalized =
      normalize(type);

    if (
      scope === 'all'
    ) {
      return true;
    }

    if (
      scope === 'paste'
    ) {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(
        normalized
      );
    }

    return (
      normalized ===
      normalize(scope)
    );
  };

  const matchTelegramProduct = (
    item,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }

    if (
      scope !== 'code'
    ) {
      return false;
    }

    const type =
      normalize(
        item?.product_type ||
        item?.type
      );

    return [
      'code',
      'product',
      'file'
    ].includes(
      type
    );
  };

  const matchChannel = (
    item,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }

    return (
      normalize(
        item?.type
      ) ===
      normalize(scope)
    );
  };

  const matchEvent = (
    event,
    scope
  ) => {
    if (
      scope === 'all'
    ) {
      return true;
    }

    const target =
      normalize(
        event?.target_type
      );

    if (
      scope === 'paste'
    ) {
      return [
        'link',
        'paste',
        'pastelink'
      ].includes(
        target
      );
    }

    if (
      scope === 'code'
    ) {
      return [
        'code',
        'product',
        'file'
      ].includes(
        target
      );
    }

    if (
      scope === 'channel'
    ) {
      return [
        'channel',
        'telegram_channel'
      ].includes(
        target
      );
    }

    if (
      scope === 'group'
    ) {
      return [
        'group',
        'telegram_group'
      ].includes(
        target
      );
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
        (
          currentValue -
          previousValue
        ) /
        previousValue
      ) *
      100;

    if (
      Math.abs(percent) <
      0.05
    ) {
      return {
        direction: 'stable',
        icon: 'fa-minus',
        label: '0%',
        percent: 0
      };
    }

    const rounded =
      Math.abs(
        percent
      ).toFixed(1);

    if (
      percent > 0
    ) {
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

    if (
      !element ||
      !trend
    ) {
      return;
    }

    element.className =
      `trend trend-${trend.direction}`;

    element.innerHTML = `
      <i
        class="fa-solid ${esc(
          trend.icon
        )}"
        aria-hidden="true"
      ></i>

      <span>
        ${esc(
          trend.label
        )}
      </span>
    `;
  };

  /* =======================================================
     PAGINATION
     ======================================================= */

  function renderPager(
    id,
    page,
    total,
    onChange
  ) {
    const host =
      $(id);

    if (!host) return;

    if (
      total <= 1
    ) {
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
        Math.abs(
          i - page
        ) > 1
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
          aria-label="Halaman ${i}"
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
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              const next =
                Number(
                  button.dataset.p
                );

              if (
                Number.isFinite(
                  next
                ) &&
                next >= 1 &&
                next <= total &&
                next !== page
              ) {
                onChange(
                  next
                );
              }
            }
          );
        }
      );
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
      pastelinks,
      telegramProducts,
      telegramChannels,
      orders,
      transactions,
      analyticsEvents,
      likesResult,
      followsResult
    ] =
      await Promise.all([
        fetchAll(() =>
          supabase
            .from('products')
            .select(
              [
                'id',
                'seller_id',
                'creator_id',
                'title',
                'slug',
                'type',
                'access_type',
                'category',
                'views',
                'sales_count',
                'price',
                'status',
                'created_at'
              ].join(',')
            )
            .or(
              `creator_id.eq.${user.id},seller_id.eq.${user.id}`
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
            .from('pastes')
            .select(
              [
                'id',
                'owner_id',
                'title',
                'slug',
                'visibility',
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
            .from('pastelinks')
            .select(
              [
                'id',
                'user_id',
                'slug',
                'title',
                'views',
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
            .from(
              'telegram_products'
            )
            .select(
              [
                'id',
                'owner_id',
                'title',
                'slug',
                'type',
                'product_type',
                'access_type',
                'price',
                'status',
                'views',
                'sales_count',
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
            .from(
              'telegram_channels'
            )
            .select(
              [
                'id',
                'owner_id',
                'username',
                'name',
                'type',
                'access_type',
                'price',
                'status',
                'views',
                'sales_count',
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
                'buyer_id',
                'seller_id',
                'product_id',
                'amount',
                'status',
                'item_type',
                'item_id',
                'item_title',
                'payment_reference',
                'paid_at',
                'created_at'
              ].join(',')
            )
            .eq(
              'seller_id',
              user.id
            )
            .in(
              'status',
              [
                'paid',
                'success',
                'completed'
              ]
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
            .from(
              'transactions'
            )
            .select(
              [
                'id',
                'user_id',
                'amount',
                'fee',
                'net_amount',
                'type',
                'status',
                'reference',
                'description',
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
            .from(
              'analytics_events'
            )
            .select(
              [
                'id',
                'owner_id',
                'actor_id',
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
          .from(
            'content_likes'
          )
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
          .from(
            'creator_followers'
          )
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
       FILTER
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

    const filteredPastelinks =
      scope === 'all' ||
      scope === 'paste'
        ? pastelinks
        : [];

    const filteredCodes =
      telegramProducts.filter(
        (item) =>
          matchTelegramProduct(
            item,
            scope
          )
      );

    const filteredChannels =
      telegramChannels.filter(
        (item) =>
          matchChannel(
            item,
            scope
          )
      );

    const scopedEvents =
      analyticsEvents.filter(
        (event) =>
          matchEvent(
            event,
            scope
          )
      );

    /* =====================================================
       CONTENT COUNTS
       ===================================================== */

    const createdCount =
      filteredProducts.length +
      filteredPastes.length +
      filteredPastelinks.length +
      filteredCodes.length +
      filteredChannels.length;

    if ($('created')) {
      $('created').textContent =
        number(
          createdCount
        );
    }

    if ($('detailContent')) {
      $('detailContent').textContent =
        number(
          createdCount
        );
    }

    const totalLink =
      products.filter(
        (item) =>
          [
            'link',
            'paste',
            'pastelink'
          ].includes(
            normalize(
              item.type
            )
          )
      ).length +
      pastes.length +
      pastelinks.length;

    const totalCode =
      telegramProducts.filter(
        (item) =>
          [
            'code',
            'product',
            'file'
          ].includes(
            normalize(
              item.product_type ||
              item.type
            )
          )
      ).length +
      products.filter(
        (item) =>
          normalize(
            item.type
          ) === 'code'
      ).length;

    const totalChannel =
      telegramChannels.filter(
        (item) =>
          normalize(
            item.type
          ) === 'channel'
      ).length;

    if ($('totalLink')) {
      $('totalLink').textContent =
        number(
          totalLink
        );
    }

    if ($('totalCode')) {
      $('totalCode').textContent =
        number(
          totalCode
        );
    }

    if ($('totalChannel')) {
      $('totalChannel').textContent =
        number(
          totalChannel
        );
    }

    /* =====================================================
       VIEWS
       ===================================================== */

    const storedViews =
      filteredProducts.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredPastelinks.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredCodes.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      ) +
      filteredChannels.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.views || 0
          ),
        0
      );

    const analyticsViews =
      scopedEvents.filter(
        (event) =>
          normalize(
            event.event_type
          ) === 'view'
      ).length;

    const hasStoredViewSources =
      filteredProducts.length > 0 ||
      filteredPastelinks.length > 0 ||
      filteredCodes.length > 0 ||
      filteredChannels.length > 0;

    const totalViews =
      hasStoredViewSources
        ? storedViews
        : analyticsViews;

    if ($('views')) {
      $('views').textContent =
        number(
          totalViews
        );
    }

    if ($('detailViews')) {
      $('detailViews').textContent =
        number(
          totalViews
        );
    }

    /* =====================================================
       MAPS
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

    const telegramProductById =
      new Map(
        telegramProducts.map(
          (item) => [
            String(item.id),
            item
          ]
        )
      );

    const channelById =
      new Map(
        telegramChannels.map(
          (item) => [
            String(item.id),
            item
          ]
        )
      );

    /* =====================================================
       ORDER TYPE
       ===================================================== */

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
        order.item_id
      ) {
        const id =
          String(
            order.item_id
          );

        const product =
          productById.get(id);

        if (product) {
          return normalize(
            product.type
          );
        }

        const telegramProduct =
          telegramProductById.get(id);

        if (
          telegramProduct
        ) {
          return normalize(
            telegramProduct.product_type ||
            telegramProduct.type ||
            'code'
          );
        }

        const channel =
          channelById.get(id);

        if (channel) {
          return normalize(
            channel.type
          );
        }
      }

      if (
        order.product_id
      ) {
        const id =
          String(
            order.product_id
          );

        const product =
          productById.get(id);

        if (product) {
          return normalize(
            product.type
          );
        }

        const telegramProduct =
          telegramProductById.get(id);

        if (
          telegramProduct
        ) {
          return normalize(
            telegramProduct.product_type ||
            telegramProduct.type ||
            'code'
          );
        }

        const channel =
          channelById.get(id);

        if (channel) {
          return normalize(
            channel.type
          );
        }
      }

      return '';
    };

    const normalizeSaleType = (
      type
    ) => {
      let normalized =
        normalize(type);

      normalized =
        normalized.replace(
          /^telegram[-_]/,
          ''
        );

      if (
        normalized ===
        'telegram_product'
      ) {
        return 'code';
      }

      if (
        normalized ===
        'telegram_channel'
      ) {
        return 'channel';
      }

      if (
        normalized ===
        'telegram_group'
      ) {
        return 'group';
      }

      if (
        normalized ===
        'file'
      ) {
        return 'code';
      }

      return normalized;
    };

    const matchSaleScope = (
      type
    ) => {
      if (
        scope === 'all'
      ) {
        return true;
      }

      const normalized =
        normalizeSaleType(
          type
        );

      if (
        scope === 'paste'
      ) {
        return [
          'link',
          'paste',
          'pastelink'
        ].includes(
          normalized
        );
      }

      if (
        scope === 'code'
      ) {
        return [
          'code',
          'product',
          'file'
        ].includes(
          normalized
        );
      }

      return (
        normalized ===
        normalize(scope)
      );
    };

    /* =====================================================
       SALE TRANSACTIONS
       ===================================================== */

    const saleTransactions =
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

          return (
            type ===
              'sale_earning' &&
            [
              'pending',
              'completed',
              'paid',
              'success'
            ].includes(
              status
            )
          );
        }
      );

    const sellerTransactionByOrder =
      new Map();

    saleTransactions.forEach(
      (transaction) => {
        const reference =
          String(
            transaction.reference ??
            ''
          );

        if (!reference) {
          return;
        }

        const match =
          reference.match(
            /^bayargg-order:(.+)$/i
          );

        if (
          match?.[1]
        ) {
          sellerTransactionByOrder.set(
            String(
              match[1]
            ),
            transaction
          );

          return;
        }

        const order =
          orders.find(
            (item) =>
              String(
                item.id
              ) ===
              reference
          );

        if (order) {
          sellerTransactionByOrder.set(
            String(
              order.id
            ),
            transaction
          );
        }
      }
    );

    const paidOrderIds =
      new Set(
        orders.map(
          (order) =>
            String(
              order.id
            )
        )
      );

    const directSaleTransactions =
      saleTransactions.filter(
        (transaction) => {
          const reference =
            String(
              transaction.reference ??
              ''
            );

          const match =
            reference.match(
              /^bayargg-order:(.+)$/i
            );

          if (
            match?.[1] &&
            paidOrderIds.has(
              String(
                match[1]
              )
            )
          ) {
            return false;
          }

          if (
            paidOrderIds.has(
              reference
            )
          ) {
            return false;
          }

          return true;
        }
      );

    const scopedOrders =
      orders.filter(
        (order) =>
          matchSaleScope(
            getOrderType(
              order
            )
          )
      );

    const scopedDirectTransactions =
      directSaleTransactions.filter(
        (transaction) => {
          if (
            scope === 'all'
          ) {
            return true;
          }

          const rawType =
            normalize(
              transaction.type
            ).replace(
              /^sell_/,
              ''
            );

          return matchSaleScope(
            rawType
          );
        }
      );

    /* =====================================================
       SALE ROWS
       ===================================================== */

    const saleRows = [];

    scopedOrders.forEach(
      (order) => {
        const orderId =
          String(
            order.id
          );

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
              ) * 0.70;

        saleRows.push({
          id:
            `order:${orderId}`,
          source:
            'order',
          type:
            getOrderType(
              order
            ),
          date:
            order.paid_at ||
            order.created_at,
          revenue,
          title:
            order.item_title ||
            'Penjualan'
        });
      }
    );

    scopedDirectTransactions.forEach(
      (transaction) => {
        saleRows.push({
          id:
            `transaction:${transaction.id}`,
          source:
            'transaction',
          type:
            normalizeSaleType(
              transaction.type
            ),
          date:
            transaction.created_at,
          revenue:
            Number(
              transaction.net_amount ??
              transaction.amount ??
              0
            ),
          title:
            transaction.description ||
            'Penjualan'
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
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.revenue || 0
          ),
        0
      );

    if ($('sales')) {
      $('sales').textContent =
        number(
          totalSales
        );
    }

    if ($('detailSales')) {
      $('detailSales').textContent =
        number(
          totalSales
        );
    }

    if ($('revenue')) {
      $('revenue').textContent =
        money(
          totalRevenue
        );
    }

    if ($('detailRevenue')) {
      $('detailRevenue').textContent =
        money(
          totalRevenue
        );
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
            ) ===
            normalize(type)
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
      countEvent(
        'share'
      );

    if ($('interactions')) {
      const items = [
        {
          icon:
            'fa-eye',
          label:
            'Views',
          value:
            totalViews,
          color:
            'blue',
          href:
            'my-products.html?sort=views'
        },

        {
          icon:
            'fa-heart',
          label:
            'Like',
          value:
            likeCount,
          color:
            'pink',
          href:
            'my-products.html?sort=likes'
        },

        {
          icon:
            'fa-share-nodes',
          label:
            'Share',
          value:
            shareCount,
          color:
            'violet',
          href:
            'my-products.html?sort=shares'
        },

        {
          icon:
            'fa-user-plus',
          label:
            'Follower',
          value:
            followerCount,
          color:
            'green',
          href:
            'profile.html'
        }
      ];

      $('interactions').innerHTML =
        items
          .map(
            (item) => `
              <a
                class="circle-stat ${esc(
                  item.color
                )}"
                href="${esc(
                  item.href
                )}"
                aria-label="${esc(
                  `Lihat ${item.label}`
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
              </a>
            `
          )
          .join('');
    }

    /* =====================================================
       CHART DATA
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

    const previousData = {
      views: 0,
      sales: 0,
      share: 0,
      revenue: 0
    };

    /* =====================================================
       ANALYTICS
       ===================================================== */

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

      if (
        currentDayKeys.has(
          key
        )
      ) {
        if (
          type === 'view'
        ) {
          chartData[
            key
          ].views++;
        }

        if (
          type === 'share'
        ) {
          chartData[
            key
          ].share++;
        }
      }

      if (
        previousDayKeys.has(
          key
        )
      ) {
        if (
          type === 'view'
        ) {
          previousData.views++;
        }

        if (
          type === 'share'
        ) {
          previousData.share++;
        }
      }
    }

    /* =====================================================
       SALES CHART
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
          currentDayKeys.has(
            key
          )
        ) {
          chartData[
            key
          ].sales++;

          chartData[
            key
          ].revenue +=
            Number(
              sale.revenue || 0
            );
        }

        if (
          previousDayKeys.has(
            key
          )
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
      label:
        'Views',
      value:
        currentData.views,
      trend:
        viewsTrend
    };

    performanceSnapshot.sales = {
      label:
        'Sales',
      value:
        currentData.sales,
      trend:
        salesTrend
    };

    performanceSnapshot.share = {
      label:
        'Share',
      value:
        currentData.share,
      trend:
        shareTrend
    };

    performanceSnapshot.revenue = {
      label:
        'Revenue',
      value:
        currentData.revenue,
      trend:
        revenueTrend
    };

    /* =====================================================
       PERFORMANCE VALUES
       ===================================================== */

    if (
      $('performanceViews')
    ) {
      $('performanceViews').textContent =
        number(
          currentData.views
        );
    }

    if (
      $('performanceSales')
    ) {
      $('performanceSales').textContent =
        number(
          currentData.sales
        );
    }

    if (
      $('performanceShare')
    ) {
      $('performanceShare').textContent =
        number(
          currentData.share
        );
    }

    if (
      $('performanceRevenue')
    ) {
      $('performanceRevenue').textContent =
        money(
          currentData.revenue
        );
    }

    /* =====================================================
       PERIOD
       ===================================================== */

    const firstDay =
      currentDays[0];

    const lastDay =
      currentDays[
        currentDays.length - 1
      ];

    if (
      $('performancePeriod')
    ) {
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

    if (
      $('periodBadge')
    ) {
      $('periodBadge').textContent =
        '7 Hari';
    }

    /* =====================================================
       META
       ===================================================== */

    const performanceMeta =
      document.querySelector(
        '.performance-meta'
      );

    if (
      performanceMeta
    ) {
      const items =
        performanceMeta.querySelectorAll(
          '.performance-meta-item'
        );

      if (items[0]) {
        const span =
          items[0].querySelector(
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

      if (items[1]) {
        const span =
          items[1].querySelector(
            'span'
          );

        if (span) {
          span.textContent =
            `Trend otomatis · ${revenueTrend.label}`;
        }
      }
    }

    /* =====================================================
       REVENUE
       ===================================================== */

    if (
      $('revenueTrendValue')
    ) {
      $('revenueTrendValue').textContent =
        money(
          currentData.revenue
        );
    }

    /* =====================================================
       REVENUE BARS
       ===================================================== */

    if (
      $('revenueBars')
    ) {
      const maxRevenue =
        Math.max(
          1,
          ...currentDays.map(
            (day) =>
              Number(
                chartData[
                  dateKey(day)
                ]?.revenue ||
                0
              )
          )
        );

      $('revenueBars').innerHTML =
        currentDays
          .map(
            (day) => {
              const key =
                dateKey(day);

              const revenue =
                Number(
                  chartData[
                    key
                  ]?.revenue ||
                  0
                );

              const height =
                revenue > 0
                  ? Math.max(
                      3,
                      (
                        revenue /
                        maxRevenue
                      ) *
                        100
                    )
                  : 2;

              return `
                <div
                  class="revenue-bar"
                  data-date="${esc(
                    key
                  )}"
                  tabindex="0"
                  role="button"
                  aria-label="${esc(
                    `Revenue ${formatDay(day)}`
                  )}"
                  title="${esc(
                    `${formatDay(day)} — ${money(
                      revenue
                    )}`
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
                  `${formatDate(
                    bar.dataset.date
                  )} · Revenue ${money(
                    item.revenue || 0
                  )}`,
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
                  event.key ===
                    ' '
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
       CHART
       ===================================================== */

    if (
      $('chart')
    ) {
      const max =
        Math.max(
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

      $('chart').innerHTML =
        currentDays
          .map(
            (day) => {
              const key =
                dateKey(day);

              const item =
                chartData[
                  key
                ] || {};

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
                      (
                        views /
                        max
                      ) *
                        100
                    )
                  : 2;

              const salesHeight =
                sales > 0
                  ? Math.max(
                      3,
                      (
                        sales /
                        max
                      ) *
                        100
                    )
                  : 2;

              const shareHeight =
                share > 0
                  ? Math.max(
                      3,
                      (
                        share /
                        max
                      ) *
                        100
                    )
                  : 2;

              return `
                <div
                  class="chart-day"
                  data-date="${esc(
                    key
                  )}"
                  tabindex="0"
                  role="button"
                  aria-label="${esc(
                    `Performa ${formatDay(day)}`
                  )}"
                  title="${esc(
                    `${formatDay(day)} — Views ${number(
                      views
                    )}, Sales ${number(
                      sales
                    )}, Share ${number(
                      share
                    )}`
                  )}"
                >
                  <div class="bars">

                    <i
                      class="bar-views"
                      style="height:${viewsHeight}%"
                      aria-label="Views ${number(
                        views
                      )}"
                    ></i>

                    <i
                      class="bar-sales"
                      style="height:${salesHeight}%"
                      aria-label="Sales ${number(
                        sales
                      )}"
                    ></i>

                    <i
                      class="bar-share"
                      style="height:${shareHeight}%"
                      aria-label="Share ${number(
                        share
                      )}"
                    ></i>

                  </div>

                  <small>
                    ${esc(
                      formatDay(day)
                    )}
                  </small>
                </div>
              `;
            }
          )
          .join('');

      $('chart')
        .querySelectorAll(
          '.chart-day'
        )
        .forEach(
          (dayElement) => {
            const handler =
              () => {
                const key =
                  dayElement.dataset.date;

                const item =
                  chartData[
                    key
                  ] || {};

                toast(
                  `${formatDate(
                    key
                  )} · Views ${number(
                    item.views || 0
                  )} · Sales ${number(
                    item.sales || 0
                  )} · Share ${number(
                    item.share || 0
                  )} · Revenue ${money(
                    item.revenue || 0
                  )}`,
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
                  event.key ===
                    'Enter' ||
                  event.key ===
                    ' '
                ) {
                  event.preventDefault();
                  handler();
                }
              }
            );
          }
        );
    }

    /* =====================================================
       FOLLOWERS
       ===================================================== */

    if (
      $('followerTotal')
    ) {
      $('followerTotal').textContent =
        number(
          followerCount
        );
    }

    if (
      $('followerCountries')
    ) {
      $('followerCountries').innerHTML =
        followerCount > 0
          ? `
            <div class="empty">
              <i class="fa-solid fa-users"></i>
              <span>
                ${number(
                  followerCount
                )}
                pengikut tercatat.
              </span>
            </div>
          `
          : `
            <div class="empty">
              <i class="fa-solid fa-user-plus"></i>
              <span>
                Belum ada pengikut.
              </span>
            </div>
          `;
    }

    if (
      $('followerDonut')
    ) {
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
          id:
            item.id,
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
            ),
          href:
            item.slug
              ? `view.html?slug=${encodeURIComponent(
                  item.slug
                )}`
              : 'my-products.html'
        })
      ),

      ...filteredPastes.map(
        (item) => ({
          id:
            item.id,
          title:
            item.title ||
            item.slug ||
            'Paste',
          type:
            'paste',
          icon:
            'fa-file-lines',
          date:
            item.created_at,
          views:
            0,
          price:
            0,
          href:
            item.slug
              ? `view.html?slug=${encodeURIComponent(
                  item.slug
                )}`
              : 'my-products.html'
        })
      ),

      ...filteredPastelinks.map(
        (item) => ({
          id:
            item.id,
          title:
            item.title ||
            item.slug ||
            'PasteLink',
          type:
            'pastelink',
          icon:
            'fa-link',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            0,
          href:
            item.slug
              ? `view.html?slug=${encodeURIComponent(
                  item.slug
                )}`
              : 'my-products.html'
        })
      ),

      ...filteredCodes.map(
        (item) => ({
          id:
            item.id,
          title:
            item.title ||
            'Code',
          type:
            item.product_type ||
            item.type ||
            'code',
          icon:
            'fa-code',
          date:
            item.created_at,
          views:
            Number(
              item.views || 0
            ),
          price:
            Number(
              item.price || 0
            ),
          href:
            item.slug
              ? `view.html?slug=${encodeURIComponent(
                  item.slug
                )}`
              : 'my-products.html'
        })
      ),

      ...filteredChannels.map(
        (item) => ({
          id:
            item.id,
          title:
            item.name ||
            item.username ||
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
          views:
            Number(
              item.views || 0
            ),
          price:
            Number(
              item.price || 0
            ),
          href:
            item.slug
              ? `view.html?slug=${encodeURIComponent(
                  item.slug
                )}`
              : 'my-products.html'
        })
      )
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(
            a.date
          )?.getTime() ||
          0;

        const dateB =
          safeDate(
            b.date
          )?.getTime() ||
          0;

        return (
          dateB -
          dateA
        );
      }
    );

    const recentPageSize =
      5;

    let recentPage =
      1;

    const renderRecent =
      () => {
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
            recentPage -
            1
          ) *
          recentPageSize;

        const rows =
          recentRows.slice(
            start,
            start +
              recentPageSize
          );

        if (
          $('recentLinks')
        ) {
          $('recentLinks').innerHTML =
            rows.length
              ? rows
                  .map(
                    (item) => `
                      <a
                        class="recent-item"
                        href="${esc(
                          item.href
                        )}"
                        aria-label="${esc(
                          `Buka ${item.title}`
                        )}"
                      >
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

                        <i
                          class="fa-solid fa-chevron-right"
                          aria-hidden="true"
                        ></i>
                      </a>
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
            recentPage =
              page;

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
            event.created_at,
          href:
            'notifications.html'
        })
      );

    const orderActivities =
      scopedOrders.map(
        (order) => ({
          type:
            'paid',
          date:
            order.paid_at ||
            order.created_at,
          href:
            'purchases.html'
        })
      );

    const transactionActivities =
      scopedDirectTransactions.map(
        (transaction) => ({
          type:
            'sale',
          date:
            transaction.created_at,
          href:
            'transactions.html'
        })
      );

    const activities = [
      ...activityEvents,
      ...orderActivities,
      ...transactionActivities
    ].sort(
      (a, b) => {
        const dateA =
          safeDate(
            a.date
          )?.getTime() ||
          0;

        const dateB =
          safeDate(
            b.date
          )?.getTime() ||
          0;

        return (
          dateB -
          dateA
        );
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

    const activityPageSize =
      5;

    let activityPage =
      1;

    const renderActivity =
      () => {
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
            activityPage -
            1
          ) *
          activityPageSize;

        const rows =
          activities.slice(
            start,
            start +
              activityPageSize
          );

        if (
          $('activity')
        ) {
          $('activity').innerHTML =
            rows.length
              ? rows
                  .map(
                    (item) => `
                      <a
                        class="activity-row"
                        href="${esc(
                          item.href
                        )}"
                        aria-label="${esc(
                          `Buka aktivitas ${activityLabel(
                            item.type
                          )}`
                        )}"
                      >
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

                        <i
                          class="fa-solid fa-chevron-right"
                          aria-hidden="true"
                        ></i>
                      </a>
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
            activityPage =
              page;

            renderActivity();
          }
        );
      };

    renderActivity();

    /* =====================================================
       PERFORMANCE CARDS
       ===================================================== */

    document
      .querySelectorAll(
        '[data-performance]'
      )
      .forEach(
        (element) => {
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
                `${item.label}: ${value} · Performa ${
                  item.trend?.label ||
                  '0%'
                }`,
                item.trend
                  ?.direction ===
                  'down'
                  ? 'error'
                  : 'success'
              );
            }
          );
        }
      );

    /* =====================================================
       DASHBOARD STATIC INTERACTION
       ===================================================== */

    /* Main statistics */
    const staticLinks = {
      created:
        'my-products.html',

      views:
        'my-products.html?sort=views',

      sales:
        'purchases.html',

      revenue:
        'wallet.html',

      totalLink:
        'my-products.html?type=link',

      totalCode:
        'my-products.html?type=code',

      totalChannel:
        'my-products.html?type=channel',

      detailContent:
        'my-products.html',

      detailViews:
        'my-products.html?sort=views',

      detailSales:
        'purchases.html',

      detailRevenue:
        'wallet.html'
    };

    Object.entries(
      staticLinks
    ).forEach(
      ([id, href]) => {
        const element =
          $(id);

        if (!element) {
          return;
        }

        /*
         * Jika HTML sudah anchor,
         * cukup pastikan href benar.
         */
        if (
          element.tagName ===
          'A'
        ) {
          element.setAttribute(
            'href',
            href
          );

          return;
        }

        makeInteractive(
          element,
          href,
          `Lihat ${id}`
        );
      }
    );

    /* =====================================================
       FOLLOWER PANEL
       ===================================================== */

    [
      $('followerDonut'),
      $('followerTotal'),
      $('followerCountries')
    ].forEach(
      (element) => {
        if (!element) return;

        makeInteractive(
          element,
          'profile.html',
          'Lihat statistik follower'
        );
      }
    );

    /* =====================================================
       REVENUE PANEL
       ===================================================== */

    [
      $('revenueTrendValue'),
      $('revenueTrendChange')
    ].forEach(
      (element) => {
        if (!element) return;

        makeInteractive(
          element,
          'wallet.html',
          'Lihat pendapatan'
        );
      }
    );

    /* =====================================================
       SECTION TITLES
       ===================================================== */

    [
      [
        'interactionTitle',
        'my-products.html',
        'Lihat semua interaksi'
      ],

      [
        'performanceTitle',
        'my-products.html',
        'Lihat performa'
      ],

      [
        'followerStatsTitle',
        'profile.html',
        'Lihat statistik follower'
      ],

      [
        'revenueTrendTitle',
        'wallet.html',
        'Lihat pendapatan'
      ],

      [
        'detailStatsTitle',
        'my-products.html',
        'Lihat statistik detail'
      ],

      [
        'recentContentTitle',
        'my-products.html',
        'Lihat semua konten'
      ],

      [
        'activityTitle',
        'notifications.html',
        'Lihat semua aktivitas'
      ]
    ].forEach(
      ([id, href, label]) => {
        const element =
          $(id);

        if (!element) {
          return;
        }

        makeInteractive(
          element,
          href,
          label
        );
      }
    );
  }

  /* =======================================================
     SCOPE CHANGE
     ======================================================= */

  const scopeElement =
    $('scope');

  if (
    scopeElement
  ) {
    scopeElement.addEventListener(
      'change',
      async () => {
        try {
          await load();
        } catch (
          error
        ) {
          console.error(
            '[PasTele Dashboard] Scope error:',
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
  } catch (
    error
  ) {
    console.error(
      '[PasTele Dashboard] Load error:',
      error
    );

    if ($('created')) {
      $('created').textContent =
        '0';
    }

    if ($('views')) {
      $('views').textContent =
        '0';
    }

    if ($('sales')) {
      $('sales').textContent =
        '0';
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
