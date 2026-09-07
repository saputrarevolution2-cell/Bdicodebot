/* =========================================================
   PasTele — Marketplace
   PUBLIC MARKETPLACE
   Guest can browse + open + purchase paid products.
   Authentication is required only for protected creator
   actions / checkout where applicable.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  /* =======================================================
     DOM
     ======================================================= */

  const $ = (id) => document.getElementById(id);

  const q = $("q");
  const market = $("market");

  /* =======================================================
     STATE
     ======================================================= */

  let filter = "all";
  let items = [];
  let page = 1;

  const pageSize = 5;


  /* =======================================================
     GLOBAL HELPERS
     ======================================================= */

  const TC = window.TC || {};

  const esc = (value) => {
    const text = String(value ?? "");

    if (typeof TC.esc === "function") {
      return TC.esc(text);
    }

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };


  const number = (value) => {
    const n = Number(value ?? 0);

    return Number.isFinite(n)
      ? n
      : 0;
  };


  const lower = (value) => {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  };


  const formatNumber = (value) => {
    return number(value).toLocaleString("id-ID");
  };


  const formatMoney = (value) => {
    const amount = number(value);

    if (typeof TC.money === "function") {
      return TC.money(amount);
    }

    return `Rp${amount.toLocaleString("id-ID")}`;
  };


  const toast = (message, type = "error") => {
    if (typeof TC.toast === "function") {
      TC.toast(message, type);
    } else {
      console[type === "error" ? "error" : "log"](
        message
      );
    }
  };


  /* =======================================================
     SUPABASE
     ======================================================= */

  const getSupabase = () => {
    return window.sb || null;
  };


  /* =======================================================
     TYPE
     ======================================================= */

  const typeOf = (item) => {
    const type = lower(item?.type);

    if (
      type === "pastelink" ||
      type === "paste-link" ||
      type === "paste_link"
    ) {
      return "link";
    }

    if (
      type === "telegram_channel"
    ) {
      return "channel";
    }

    if (
      type === "telegram_group"
    ) {
      return "group";
    }

    return type || "link";
  };


  const icon = (type) => {
    switch (typeOf({ type })) {
      case "code":
        return "fa-code";

      case "channel":
        return "fa-broadcast-tower";

      case "group":
        return "fa-users";

      case "paste":
      case "pastelink":
        return "fa-file-lines";

      case "link":
      default:
        return "fa-link";
    }
  };


  const typeLabel = (type) => {
    switch (typeOf({ type })) {
      case "code":
        return "Code";

      case "channel":
        return "Channel";

      case "group":
        return "Group";

      case "paste":
      case "pastelink":
        return "Paste Link";

      case "link":
      default:
        return "Link";
    }
  };


  /* =======================================================
     ACCESS
     ======================================================= */

  const accessType = (item) => {
    const access = lower(item?.access_type);
    const price = number(item?.price);

    if (
      access === "paid" ||
      price > 0
    ) {
      return "paid";
    }

    return "free";
  };


  const priceText = (item) => {
    const price = number(item?.price);

    return price > 0
      ? formatMoney(price)
      : "FREE";
  };


  /* =======================================================
     CREATOR
     ======================================================= */

  const creatorText = (item) => {
    return (
      item?.creator_name ||
      item?.creator_username ||
      "Creator"
    );
  };


  /* =======================================================
     STATS
     ======================================================= */

  const viewsText = (item) => {
    return formatNumber(
      item?.views
    );
  };


  const salesText = (item) => {
    return formatNumber(
      item?.sales_count
    );
  };


  const likesText = (item) => {
    return formatNumber(
      item?.likes_count
    );
  };


  const commentsText = (item) => {
    return formatNumber(
      item?.comments_count
    );
  };


  const sharesText = (item) => {
    return formatNumber(
      item?.shares_count
    );
  };


  /* =======================================================
     PRODUCT URL
     ======================================================= */

  const productUrl = (item) => {
    const id = item?.id;

    if (!id) {
      return "product.html";
    }

    const type = typeOf(item);

    return (
      `product.html?id=${encodeURIComponent(id)}` +
      `&type=${encodeURIComponent(type)}`
    );
  };


  /* =======================================================
     FILTER
     ======================================================= */

  function matchesFilter(item) {
    const type = typeOf(item);
    const access = accessType(item);

    if (filter === "all") {
      return true;
    }

    if (
      filter === "free" ||
      filter === "paid"
    ) {
      return access === filter;
    }

    return type === filter;
  }


  /* =======================================================
     SEARCH
     ======================================================= */

  function matchesSearch(item) {
    const query = lower(
      q?.value
    );

    if (!query) {
      return true;
    }

    const searchable = [
      item?.title,
      item?.creator_name,
      item?.creator_username,
      item?.category,
      item?.description,
      item?.type,
      item?.access_type
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined
      )
      .join(" ")
      .toLowerCase();

    return searchable.includes(
      query
    );
  }


  /* =======================================================
     FILTERED ITEMS
     ======================================================= */

  function filteredItems() {
    return items.filter((item) => {
      return (
        matchesFilter(item) &&
        matchesSearch(item)
      );
    });
  }


  /* =======================================================
     THUMBNAIL
     ======================================================= */

  const thumbnailHtml = (
    item,
    type,
    title
  ) => {
    const thumbnail =
      String(
        item?.thumbnail_url || ""
      ).trim();

    if (!thumbnail) {
      return `
        <span class="product-thumb-fallback">
          <i
            class="fa-solid ${icon(type)}"
            aria-hidden="true"
          ></i>
        </span>
      `;
    }

    return `
      <img
        loading="lazy"
        src="${esc(thumbnail)}"
        alt="${esc(title)}"
        onerror="
          this.style.display='none';
          if(this.nextElementSibling){
            this.nextElementSibling.hidden=false;
          }
        "
      >

      <span
        class="product-thumb-fallback"
        hidden
      >
        <i
          class="fa-solid ${icon(type)}"
          aria-hidden="true"
        ></i>
      </span>
    `;
  };


  /* =======================================================
     PRODUCT CARD
     ======================================================= */

  function card(item) {
    const type = typeOf(item);
    const access = accessType(item);

    const title =
      item?.title ||
      "Untitled";

    const creator =
      creatorText(item);

    const description =
      String(
        item?.description || ""
      ).trim();

    const href =
      productUrl(item);

    return `
      <a
        class="product-card"
        href="${href}"
        aria-label="Buka ${esc(title)}"
      >

        <!-- THUMBNAIL -->
        <div class="product-thumb">

          ${thumbnailHtml(
            item,
            type,
            title
          )}

          <span
            class="product-access ${access}"
          >
            <i
              class="fa-solid ${
                access === "paid"
                  ? "fa-lock"
                  : "fa-unlock"
              }"
              aria-hidden="true"
            ></i>

            ${access === "paid"
              ? "PAID"
              : "FREE"}
          </span>

        </div>


        <!-- BODY -->
        <div class="product-body">

          <!-- TYPE -->
          <span class="product-type">

            <i
              class="fa-solid ${icon(type)}"
              aria-hidden="true"
            ></i>

            ${esc(
              typeLabel(type)
            )}

          </span>


          <!-- TITLE -->
          <h3 class="product-title">
            ${esc(title)}
          </h3>


          <!-- DESCRIPTION -->
          ${
            description
              ? `
                <p class="product-description">
                  ${esc(description)}
                </p>
              `
              : ""
          }


          <!-- CREATOR -->
          <div class="product-creator">

            <i
              class="fa-solid fa-user"
              aria-hidden="true"
            ></i>

            <span>
              ${esc(creator)}
            </span>

          </div>


          <!-- ENGAGEMENT -->
          <div class="market-card-stats">

            <span>
              <i
                class="fa-solid fa-eye"
                aria-hidden="true"
              ></i>
              ${viewsText(item)}
            </span>

            <span class="like">
              <i
                class="fa-solid fa-heart"
                aria-hidden="true"
              ></i>
              ${likesText(item)}
            </span>

            <span class="comment">
              <i
                class="fa-solid fa-comment"
                aria-hidden="true"
              ></i>
              ${commentsText(item)}
            </span>

            <span class="share">
              <i
                class="fa-solid fa-share-nodes"
                aria-hidden="true"
              ></i>
              ${sharesText(item)}
            </span>

          </div>


          <!-- BOTTOM -->
          <div class="product-bottom">

            <div class="product-stats">

              <span>
                <i
                  class="fa-solid fa-eye"
                  aria-hidden="true"
                ></i>

                ${viewsText(item)}
              </span>

              ${
                number(
                  item?.sales_count
                ) > 0
                  ? `
                    <span>
                      <i
                        class="fa-solid fa-cart-shopping"
                        aria-hidden="true"
                      ></i>

                      ${salesText(item)}
                    </span>
                  `
                  : ""
              }

            </div>


            <strong
              class="product-price ${
                access === "free"
                  ? "free"
                  : ""
              }"
            >
              ${priceText(item)}
            </strong>

          </div>

        </div>

      </a>
    `;
  }


  /* =======================================================
     TOP LIST
     ======================================================= */

  function list(
    id,
    array
  ) {
    const element = $(id);

    if (!element) {
      return;
    }

    const rows = array
      .slice(0, 10)
      .map(
        (item, index) => {
          const type =
            typeOf(item);

          const href =
            productUrl(item);

          const access =
            accessType(item);

          return `
            <a
              class="market-list-item"
              href="${href}"
              aria-label="Buka ${esc(
                item?.title ||
                "Untitled"
              )}"
            >

              <span
                class="market-rank-number ${
                  index === 0
                    ? "top-one"
                    : ""
                }"
              >
                #${index + 1}
              </span>


              <div class="market-list-main">

                <strong
                  class="market-list-title"
                >
                  ${esc(
                    item?.title ||
                    "Untitled"
                  )}
                </strong>


                <div
                  class="market-list-meta"
                >

                  <span>

                    <i
                      class="fa-solid ${icon(type)}"
                      aria-hidden="true"
                    ></i>

                    ${esc(
                      typeLabel(type)
                    )}

                  </span>


                  <span>

                    <i
                      class="fa-solid fa-eye"
                      aria-hidden="true"
                    ></i>

                    ${viewsText(item)}

                  </span>

                </div>

              </div>


              <strong
                class="market-list-price ${
                  access === "free"
                    ? "free"
                    : ""
                }"
              >
                ${priceText(item)}
              </strong>

            </a>
          `;
        }
      )
      .join("");


    element.innerHTML =
      rows ||
      `
        <div class="market-empty">

          <span>
            <i
              class="fa-solid fa-box-open"
              aria-hidden="true"
            ></i>
          </span>

          <div>

            <strong>
              Belum ada data
            </strong>

            <small>
              Belum ada konten pada kategori ini.
            </small>

          </div>

        </div>
      `;
  }


  /* =======================================================
     TOP LISTS
     ======================================================= */

  function renderTopLists() {
    const byViews = (
      a,
      b
    ) => {
      return (
        number(b?.views) -
        number(a?.views)
      );
    };


    list(
      "topLink",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "link"
        )
        .slice()
        .sort(byViews)
    );


    list(
      "topCode",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "code"
        )
        .slice()
        .sort(byViews)
    );


    list(
      "topChannel",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "channel"
        )
        .slice()
        .sort(byViews)
    );


    list(
      "topGroup",
      items
        .filter(
          (item) =>
            typeOf(item) ===
            "group"
        )
        .slice()
        .sort(byViews)
    );
  }


  /* =======================================================
     RESULT BAR
     ======================================================= */

  function updateResult(count) {
    const resultTitle =
      $("resultTitle");

    const resultCount =
      $("resultCount");

    const reset =
      $("resetFilters");

    const search =
      q?.value?.trim();


    if (resultTitle) {
      if (
        filter === "all"
      ) {
        resultTitle.textContent =
          search
            ? "Hasil pencarian"
            : "Semua konten";
      } else if (
        filter === "free"
      ) {
        resultTitle.textContent =
          "Konten Free";
      } else if (
        filter === "paid"
      ) {
        resultTitle.textContent =
          "Konten Paid";
      } else {
        resultTitle.textContent =
          `${typeLabel(
            filter
          )} marketplace`;
      }
    }


    if (resultCount) {
      resultCount.textContent =
        `${count} konten`;
    }


    if (reset) {
      reset.hidden =
        filter === "all" &&
        !search;
    }
  }


  /* =======================================================
     PAGINATION
     ======================================================= */

  function renderPager(
    totalPages
  ) {
    const host =
      $("marketPagination");

    if (!host) {
      return;
    }


    if (
      totalPages <= 1
    ) {
      host.innerHTML = "";
      return;
    }


    const buttons = [];


    /* PREVIOUS */
    buttons.push(`
      <button
        type="button"
        ${page === 1 ? "disabled" : ""}
        data-page="${page - 1}"
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
    `);


    /* PAGE NUMBERS */
    for (
      let i = 1;
      i <= totalPages;
      i++
    ) {

      const shouldShow =
        totalPages <= 9 ||
        i <= 2 ||
        i >= totalPages - 1 ||
        Math.abs(i - page) <= 1;


      if (
        !shouldShow
      ) {

        if (
          i === 3 ||
          i === totalPages - 2
        ) {
          buttons.push(
            `<span aria-hidden="true">…</span>`
          );
        }

        continue;
      }


      buttons.push(`
        <button
          type="button"
          class="${
            i === page
              ? "active"
              : ""
          }"
          data-page="${i}"
          ${
            i === page
              ? 'aria-current="page"'
              : ""
          }
        >
          ${i}
        </button>
      `);
    }


    /* NEXT */
    buttons.push(`
      <button
        type="button"
        ${page === totalPages ? "disabled" : ""}
        data-page="${page + 1}"
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    `);


    host.innerHTML =
      buttons.join("");


    host
      .querySelectorAll(
        "button[data-page]"
      )
      .forEach(
        (button) => {

          button.addEventListener(
            "click",
            () => {

              const nextPage =
                Number(
                  button.dataset.page
                );


              if (
                !Number.isFinite(
                  nextPage
                ) ||
                nextPage < 1 ||
                nextPage > totalPages ||
                nextPage === page
              ) {
                return;
              }


              page =
                nextPage;

              render();


              const section =
                document.querySelector(
                  ".marketplace-page"
                );


              if (
                section
              ) {
                window.scrollTo({
                  top:
                    Math.max(
                      0,
                      section
                        .getBoundingClientRect()
                        .top +
                        window.scrollY -
                        24
                    ),
                  behavior:
                    "smooth"
                });
              }

            }
          );

        }
      );
  }


  /* =======================================================
     MAIN RENDER
     ======================================================= */

  function render() {
    if (!market) {
      return;
    }


    const filtered =
      filteredItems()
        .slice()
        .sort(
          (a, b) =>
            new Date(
              b?.created_at ||
              0
            ) -
            new Date(
              a?.created_at ||
              0
            )
        );


    updateResult(
      filtered.length
    );


    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filtered.length /
          pageSize
        )
      );


    page =
      Math.min(
        page,
        totalPages
      );


    const start =
      (page - 1) *
      pageSize;

    const end =
      start +
      pageSize;


    const pageItems =
      filtered.slice(
        start,
        end
      );


    if (
      pageItems.length
    ) {

      market.innerHTML =
        pageItems
          .map(card)
          .join("");

    } else {

      const hasSearch =
        Boolean(
          q?.value?.trim()
        );

      const hasFilter =
        filter !== "all";


      market.innerHTML = `
        <div class="market-empty">

          <span>
            <i
              class="fa-solid ${
                hasSearch ||
                hasFilter
                  ? "fa-magnifying-glass"
                  : "fa-box-open"
              }"
              aria-hidden="true"
            ></i>
          </span>

          <div>

            <strong>
              ${
                hasSearch ||
                hasFilter
                  ? "Konten tidak ditemukan"
                  : "Belum ada konten"
              }
            </strong>

            <small>
              ${
                hasSearch ||
                hasFilter
                  ? "Coba ubah pencarian atau filter."
                  : "Konten yang dipublikasikan akan muncul di sini."
              }
            </small>

          </div>

        </div>
      `;
    }


    renderPager(
      totalPages
    );

    renderTopLists();
  }


  /* =======================================================
     LOADING
     ======================================================= */

  function setLoading() {
    if (!market) {
      return;
    }


    market.innerHTML = `
      <div class="market-loading">

        <span>
          <i
            class="fa-solid fa-circle-notch fa-spin"
            aria-hidden="true"
          ></i>
        </span>

        <div>

          <strong>
            Memuat marketplace
          </strong>

          <small>
            Mengambil produk terbaru...
          </small>

        </div>

      </div>
    `;


    const resultCount =
      $("resultCount");

    if (resultCount) {
      resultCount.textContent =
        "Memuat...";
    }


    const pagination =
      $("marketPagination");

    if (pagination) {
      pagination.innerHTML =
        "";
    }
  }


  /* =======================================================
     ERROR
     ======================================================= */

  function setError(
    message
  ) {
    if (!market) {
      return;
    }


    market.innerHTML = `
      <div class="market-error">

        <span>
          <i
            class="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
          ></i>
        </span>

        <div>

          <strong>
            Marketplace gagal dimuat
          </strong>

          <small>
            ${esc(
              message
            )}
          </small>

          <button
            type="button"
            class="btn"
            id="retryMarket"
          >
            <i
              class="fa-solid fa-rotate-right"
              aria-hidden="true"
            ></i>

            Coba lagi
          </button>

        </div>

      </div>
    `;


    $("retryMarket")
      ?.addEventListener(
        "click",
        load
      );
  }


  /* =======================================================
     COUNT RELATED CONTENT
     ======================================================= */

  const countByTarget = (
    rows
  ) => {
    const map =
      Object.create(null);


    for (
      const row of rows || []
    ) {

      const id =
        row?.target_id;


      if (
        id === null ||
        id === undefined ||
        id === ""
      ) {
        continue;
      }


      const key =
        String(id);


      map[key] =
        (map[key] || 0) +
        1;
    }


    return map;
  };


  /* =======================================================
     LOAD ENGAGEMENT COUNTS
     ======================================================= */

  async function loadEngagementCounts(
    data
  ) {
    const client =
      getSupabase();

    if (
      !client ||
      !Array.isArray(data) ||
      !data.length
    ) {
      return data;
    }


    const ids =
      data
        .map(
          (item) =>
            item?.id
        )
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            id !== ""
        );


    if (!ids.length) {
      return data;
    }


    try {

      const [
        likesResult,
        commentsResult,
        sharesResult
      ] = await Promise.all([

        client
          .from(
            "content_likes"
          )
          .select(
            "target_id"
          )
          .in(
            "target_id",
            ids
          ),

        client
          .from(
            "content_comments"
          )
          .select(
            "target_id"
          )
          .in(
            "target_id",
            ids
          ),

        client
          .from(
            "analytics_events"
          )
          .select(
            "target_id"
          )
          .in(
            "target_id",
            ids
          )
          .eq(
            "event_type",
            "share"
          )

      ]);


      /*
       * Engagement statistics are supplementary.
       * If one of the tables is unavailable because of
       * RLS/schema differences, marketplace products
       * must still remain visible.
       */

      if (
        likesResult?.error
      ) {
        console.warn(
          "Marketplace likes count:",
          likesResult.error
        );
      }


      if (
        commentsResult?.error
      ) {
        console.warn(
          "Marketplace comments count:",
          commentsResult.error
        );
      }


      if (
        sharesResult?.error
      ) {
        console.warn(
          "Marketplace shares count:",
          sharesResult.error
        );
      }


      const likes =
        countByTarget(
          likesResult?.data
        );

      const comments =
        countByTarget(
          commentsResult?.data
        );

      const shares =
        countByTarget(
          sharesResult?.data
        );


      return data.map(
        (item) => {

          const key =
            String(
              item?.id
            );


          return {
            ...item,

            likes_count:
              likes[key] || 0,

            comments_count:
              comments[key] || 0,

            shares_count:
              shares[key] || 0
          };
        }
      );

    } catch (error) {

      /*
       * Never block the public marketplace because
       * engagement statistics failed.
       */

      console.warn(
        "Marketplace engagement counts unavailable:",
        error
      );

      return data;
    }
  }


  /* =======================================================
     LOAD MARKETPLACE
     ======================================================= */

  async function load() {
    const client =
      getSupabase();


    /*
     * IMPORTANT:
     * Marketplace is PUBLIC.
     *
     * Do NOT require a logged-in user here.
     * Guests must be able to browse marketplace.
     */

    if (!client) {

      const message =
        "Database belum terkonfigurasi.";

      setError(
        message
      );

      toast(
        message,
        "error"
      );

      return;
    }


    setLoading();


    try {

      const result =
        await client
          .from(
            "marketplace_public"
          )
          .select(
            [
              "id",
              "slug",
              "title",
              "type",
              "access_type",
              "price",
              "thumbnail_url",
              "description",
              "content",
              "views",
              "sales_count",
              "category",
              "created_at",
              "creator_name",
              "creator_username",
              "owner_id"
            ].join(",")
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          )
          .limit(500);


      if (
        result.error
      ) {
        throw result.error;
      }


      let data =
        Array.isArray(
          result.data
        )
          ? result.data
          : [];


      /*
       * Engagement counts are optional.
       * Product loading does not depend on them.
       */

      data =
        await loadEngagementCounts(
          data
        );


      items =
        data;


      page = 1;


      render();

    } catch (error) {

      console.error(
        "Marketplace load error:",
        error
      );


      const message =
        error?.message ||
        "Marketplace gagal dimuat.";


      setError(
        message
      );


      toast(
        message,
        "error"
      );
    }
  }


  /* =======================================================
     FILTER BUTTONS
     ======================================================= */

  document
    .querySelectorAll(
      "#tabs .market-tab"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                "#tabs .market-tab"
              )
              .forEach(
                (item) => {
                  item.classList.remove(
                    "active"
                  );
                }
              );


            button.classList.add(
              "active"
            );


            filter =
              button.dataset.v ||
              "all";


            page = 1;


            render();

          }
        );

      }
    );


  /* =======================================================
     SEARCH
     ======================================================= */

  function updateSearchButton() {
    const button =
      $("clearSearch");


    if (!button) {
      return;
    }


    button.hidden =
      !q?.value?.trim();
  }


  q?.addEventListener(
    "input",
    () => {

      updateSearchButton();

      page = 1;

      render();

    }
  );


  /* =======================================================
     CLEAR SEARCH
     ======================================================= */

  $("clearSearch")
    ?.addEventListener(
      "click",
      () => {

        if (q) {
          q.value = "";
        }


        updateSearchButton();

        page = 1;

        render();

        q?.focus();

      }
    );


  /* =======================================================
     RESET FILTERS
     ======================================================= */

  $("resetFilters")
    ?.addEventListener(
      "click",
      () => {

        filter =
          "all";


        if (q) {
          q.value = "";
        }


        document
          .querySelectorAll(
            "#tabs .market-tab"
          )
          .forEach(
            (button) => {

              button.classList.toggle(
                "active",
                button.dataset.v ===
                  "all"
              );

            }
          );


        updateSearchButton();

        page = 1;

        render();

      }
    );


  /* =======================================================
     INITIAL STATE
     ======================================================= */

  updateSearchButton();

  await load();

});
