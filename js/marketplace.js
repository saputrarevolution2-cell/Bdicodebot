/* =========================================================
   PasTele — Marketplace
   Canonical page script
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);
  let filter = "all";
  let items = [];
  const q = $("q");
  const market = $("market");
  /* =======================================================
     HELPERS
     ======================================================= */
  const esc = (value) => TC.esc(String(value ?? ""));
  const number = (value) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const lower = (value) =>
    String(value ?? "").trim().toLowerCase();
  const typeOf = (item) => {
    const type = lower(item?.type);
    if (type === "pastelink" || type === "paste-link") {
      return "link";
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
  const accessType = (item) => {
    const access = lower(item?.access_type);
    if (
      access === "paid" ||
      number(item?.price) > 0
    ) {
      return "paid";
    }
    return "free";
  };
  const priceText = (item) => {
    const price = number(item?.price);
    return price > 0
      ? TC.money(price)
      : "FREE";
  };
  const creatorText = (item) => {
    return (
      item?.creator_name ||
      item?.creator_username ||
      "Creator"
    );
  };
  const viewsText = (item) => {
    return number(item?.views)
      .toLocaleString("id-ID");
  };
  const salesText = (item) => {
    return number(item?.sales_count)
      .toLocaleString("id-ID");
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
    if (filter === "free" || filter === "paid") {
      return access === filter;
    }
    return type === filter;
  }
  function matchesSearch(item) {
    const query = lower(q?.value);
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
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(query);
  }
  function filteredItems() {
    return items.filter((item) => {
      return (
        matchesFilter(item) &&
        matchesSearch(item)
      );
    });
  }
  /* =======================================================
     CARD
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
      item?.description ||
      "";
    const href =
      `product.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(type)}`;
    const thumbnail = item?.thumbnail_url
      ? `
        <img
          loading="lazy"
          src="${esc(item.thumbnail_url)}"
          alt="${esc(title)}"
          onerror="this.style.display='none';this.nextElementSibling.hidden=false"
        >
        <span
          class="product-thumb-fallback"
          hidden
        >
          <i class="fa-solid ${icon(type)}"></i>
        </span>
      `
      : `
        <span class="product-thumb-fallback">
          <i class="fa-solid ${icon(type)}"></i>
        </span>
      `;
    return `
      <a
        class="product-card"
        href="${href}"
        aria-label="Buka ${esc(title)}"
      >
        <div class="product-thumb">
          ${thumbnail}
          <span class="product-access ${access}">
            <i class="fa-solid ${
              access === "paid"
                ? "fa-lock"
                : "fa-unlock"
            }"></i>
            ${access.toUpperCase()}
          </span>
        </div>
        <div class="product-body">
          <span class="product-type">
            <i class="fa-solid ${icon(type)}"></i>
            ${esc(typeLabel(type))}
          </span>
          <h3 class="product-title">
            ${esc(title)}
          </h3>
          ${
            description
              ? `
                <p class="product-description">
                  ${esc(description)}
                </p>
              `
              : ""
          }
          <div class="product-creator">
            <i class="fa-solid fa-user"></i>
            <span>${esc(creator)}</span>
          </div>
          <div class="product-bottom">
            <div class="product-stats">
              <span>
                <i class="fa-solid fa-eye"></i>
                ${viewsText(item)}
              </span>
              ${
                number(item?.sales_count) > 0
                  ? `
                    <span>
                      <i class="fa-solid fa-cart-shopping"></i>
                      ${salesText(item)}
                    </span>
                  `
                  : ""
              }
            </div>
            <strong class="product-price ${
              access === "free"
                ? "free"
                : ""
            }">
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
  function list(id, array) {
    const element = $(id);
    if (!element) {
      return;
    }
    const rows = array
      .slice(0, 10)
      .map((item, index) => {
        const type = typeOf(item);
        const href =
          `product.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(type)}`;
        const access =
          accessType(item);
        return `
          <a
            class="market-list-item"
            href="${href}"
          >
            <span class="market-rank-number ${
              index === 0
                ? "top-one"
                : ""
            }">
              #${index + 1}
            </span>
            <div class="market-list-main">
              <strong class="market-list-title">
                ${esc(item?.title || "Untitled")}
              </strong>
              <div class="market-list-meta">
                <span>
                  <i class="fa-solid ${icon(type)}"></i>
                  ${esc(typeLabel(type))}
                </span>
                <span>
                  <i class="fa-solid fa-eye"></i>
                  ${viewsText(item)}
                </span>
              </div>
            </div>
            <strong class="market-list-price ${
              access === "free"
                ? "free"
                : ""
            }">
              ${priceText(item)}
            </strong>
          </a>
        `;
      })
      .join("");
    element.innerHTML =
      rows ||
      `
        <div class="market-empty">
          <span>
            <i class="fa-solid fa-box-open"></i>
          </span>
          <div>
            <strong>Belum ada data</strong>
            <small>
              Belum ada konten pada kategori ini.
            </small>
          </div>
        </div>
      `;
  }
  /* =======================================================
     RENDER
     ======================================================= */
  function render() {
    if (!market) {
      return;
    }
    const filtered =
      filteredItems()
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );
    updateResult(filtered.length);
    market.innerHTML =
      filtered.length
        ? filtered.map(card).join("")
        : `
          <div class="market-empty">
            <span>
              <i class="fa-solid fa-magnifying-glass"></i>
            </span>
            <div>
              <strong>
                ${
                  q?.value?.trim() || filter !== "all"
                    ? "Konten tidak ditemukan"
                    : "Belum ada konten"
                }
              </strong>
              <small>
                ${
                  q?.value?.trim() || filter !== "all"
                    ? "Coba ubah pencarian atau filter."
                    : "Konten yang dipublikasikan akan muncul di sini."
                }
              </small>
            </div>
          </div>
        `;
    renderTopLists();
  }
  /* =======================================================
     TOP LISTS
     ======================================================= */
  function renderTopLists() {
    const byViews = (a, b) =>
      number(b?.views) -
      number(a?.views);
    list(
      "topLink",
      items
        .filter((x) => typeOf(x) === "link")
        .sort(byViews)
    );
    list(
      "topCode",
      items
        .filter((x) => typeOf(x) === "code")
        .sort(byViews)
    );
    list(
      "topChannel",
      items
        .filter((x) => typeOf(x) === "channel")
        .sort(byViews)
    );
    list(
      "topGroup",
      items
        .filter((x) => typeOf(x) === "group")
        .sort(byViews)
    );
  }
  /* =======================================================
     RESULT
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
      if (filter === "all") {
        resultTitle.textContent =
          search
            ? "Hasil pencarian"
            : "Semua konten";
      } else if (filter === "free") {
        resultTitle.textContent =
          "Konten Free";
      } else if (filter === "paid") {
        resultTitle.textContent =
          "Konten Paid";
      } else {
        resultTitle.textContent =
          `${typeLabel(filter)} marketplace`;
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
     LOADING
     ======================================================= */
  function setLoading() {
    if (!market) {
      return;
    }
    market.innerHTML = `
      <div class="market-loading">
        <span>
          <i class="fa-solid fa-circle-notch"></i>
        </span>
        <div>
          <strong>Memuat marketplace</strong>
          <small>
            Mengambil produk terbaru...
          </small>
        </div>
      </div>
    `;
    if ($("resultCount")) {
      $("resultCount").textContent =
        "Memuat...";
    }
  }
  /* =======================================================
     ERROR
     ======================================================= */
  function setError(message) {
    if (!market) {
      return;
    }
    market.innerHTML = `
      <div class="market-error">
        <span>
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
        <div>
          <strong>
            Marketplace gagal dimuat
          </strong>
          <small>
            ${esc(message)}
          </small>
          <button
            type="button"
            class="btn"
            id="retryMarket"
          >
            <i class="fa-solid fa-rotate-right"></i>
            Coba lagi
          </button>
        </div>
      </div>
    `;
    $("retryMarket")?.addEventListener(
      "click",
      load
    );
  }
  /* =======================================================
     LOAD SUPABASE
     ======================================================= */
  async function load() {
    if (!window.sb) {
      const message =
        "Database belum terkonfigurasi.";
      setError(message);
      TC.toast(
        message,
        "error"
      );
      return;
    }
    setLoading();
    try {
      const result = await sb
        .from("marketplace_public")
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
          { ascending: false }
        )
        .limit(500);
      if (result.error) {
        throw result.error;
      }
      items = Array.isArray(result.data)
        ? result.data
        : [];
      render();
    } catch (error) {
      console.error(
        "Marketplace load error:",
        error
      );
      const message =
        error?.message ||
        "Marketplace gagal dimuat.";
      setError(message);
      TC.toast(
        message,
        "error"
      );
    }
  }
  /* =======================================================
     FILTER BUTTONS
     ======================================================= */
  document
    .querySelectorAll("#tabs .market-tab")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll("#tabs .market-tab")
            .forEach((item) => {
              item.classList.remove(
                "active"
              );
            });
          button.classList.add(
            "active"
          );
          filter =
            button.dataset.v ||
            "all";
          render();
        }
      );
    });
  /* =======================================================
     SEARCH
     ======================================================= */
  q?.addEventListener(
    "input",
    () => {
      updateSearchButton();
      render();
    }
  );
  function updateSearchButton() {
    const button =
      $("clearSearch");
    if (!button) {
      return;
    }
    button.hidden =
      !q?.value?.trim();
  }
  $("clearSearch")?.addEventListener(
    "click",
    () => {
      if (q) {
        q.value = "";
      }
      updateSearchButton();
      render();
      q?.focus();
    }
  );
  /* =======================================================
     RESET
     ======================================================= */
  $("resetFilters")?.addEventListener(
    "click",
    () => {
      filter = "all";
      if (q) {
        q.value = "";
      }
      document
        .querySelectorAll(
          "#tabs .market-tab"
        )
        .forEach((button) => {
          button.classList.toggle(
            "active",
            button.dataset.v === "all"
          );
        });
      updateSearchButton();
      render();
    }
  );
  /* =======================================================
     INITIAL
     ======================================================= */
  await load();
});
