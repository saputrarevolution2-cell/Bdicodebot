/* =========================================================
   PasTele — CREATE PRODUCT
   Real Supabase / Clean Validation / No Dummy Data
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("f");
  const title = $("title");
  const slug = $("slug");
  const price = $("price");
  const thumb = $("thumb");
  const type = $("type");
  const access = $("access");
  const desc = $("desc");
  const content = $("content");
  const submitBtn = $("submitBtn");
  const submitNormal = submitBtn?.querySelector(".submit-normal");
  const submitLoading = submitBtn?.querySelector(".submit-loading");
  const priceHint = $("priceHint");
  const thumbPreview = $("thumbPreview");
  const thumbImage = $("thumbImage");
  const descCounter = $("descCounter");
  const VALID_TYPES = [
    "link",
    "paste",
    "pastelink",
    "code",
    "channel",
    "group"
  ];
  const VALID_ACCESS = [
    "free",
    "paid"
  ];\n  const syncFeatureForm = () => {\n    document.body.dataset.productType = type?.value || "";\n    const map = { link:["fa-link","Link / URL"], paste:["fa-file-lines","Paste"], pastelink:["fa-link","PasteLink"], code:["fa-code","Code Telegram"], channel:["fa-broadcast-tower","Channel"], group:["fa-users","Group"] };\n    const info = map[type?.value] || map.link;\n    const icon = document.querySelector(".create-icon i"); if(icon) icon.className = "fa-solid " + info[0];\n    const content = document.getElementById("content"); if(content){ content.placeholder = type?.value==="code" ? "Tempel kode bot di sini..." : (type?.value==="channel"||type?.value==="group" ? "https://t.me/username atau @username" : "Masukkan content / delivery produk..."); }\n  };\n  type?.addEventListener("change", syncFeatureForm);\n  syncFeatureForm();
  let slugManuallyEdited = false;
  let submitting = false;
  /* =======================================================
     HELPERS
     ======================================================= */
  const toast = (message, type = "info") => {
    if (window.TC?.toast) {
      TC.toast(message, type);
      return;
    }
    console[type === "error" ? "error" : "log"](message);
  };
  const normalizeSlug = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  };
  const clearInvalid = (element) => {
    element?.classList.remove("invalid");
  };
  const markInvalid = (element) => {
    element?.classList.add("invalid");
    element?.focus();
  };
  const setSubmitting = (state) => {
    submitting = state;
    if (!submitBtn) return;
    submitBtn.disabled = state;
    if (submitNormal) {
      submitNormal.hidden = state;
    }
    if (submitLoading) {
      submitLoading.hidden = !state;
    }
  };
  /* =======================================================
     AUTO SLUG
     ======================================================= */
  title?.addEventListener("input", () => {
    if (!slugManuallyEdited && slug) {
      slug.value = normalizeSlug(title.value);
      clearInvalid(slug);
    }
  });
  slug?.addEventListener("input", () => {
    slugManuallyEdited = true;
    const normalized = normalizeSlug(slug.value);
    if (slug.value !== normalized) {
      slug.value = normalized;
    }
    clearInvalid(slug);
  });
  /* =======================================================
     PRICE / ACCESS
     ======================================================= */
  const syncPrice = () => {
    if (!access || !price) return;
    const paid = access.value === "paid";
    price.required = paid;
    if (!paid) {
      price.value = "0";
      if (priceHint) {
        priceHint.textContent =
          "Produk gratis tidak dikenakan biaya.";
      }
    } else {
      if (
        !price.value ||
        Number(price.value) <= 0
      ) {
        price.value = "1000";
      }
      if (priceHint) {
        priceHint.textContent =
          "Masukkan harga produk dalam Rupiah.";
      }
    }
  };
  access?.addEventListener("change", syncPrice);
  price?.addEventListener("input", () => {
    clearInvalid(price);
    if (Number(price.value) < 0) {
      price.value = "0";
    }
  });
  syncPrice();
  /* =======================================================
     DESCRIPTION COUNTER
     ======================================================= */
  const updateDescriptionCounter = () => {
    if (!desc || !descCounter) return;
    descCounter.textContent =
      `${desc.value.length} / 3000`;
  };
  desc?.addEventListener(
    "input",
    updateDescriptionCounter
  );
  updateDescriptionCounter();
  /* =======================================================
     THUMBNAIL PREVIEW
     ======================================================= */
  const hideThumbnailPreview = () => {
    if (!thumbPreview) return;
    thumbPreview.hidden = true;
    if (thumbImage) {
      thumbImage.removeAttribute("src");
    }
  };
  const showThumbnailPreview = (url) => {
    if (!thumbPreview || !thumbImage) return;
    thumbImage.src = url;
    thumbPreview.hidden = false;
  };
  thumb?.addEventListener("input", () => {
    clearInvalid(thumb);
    const url = String(thumb.value || "").trim();
    if (!url) {
      hideThumbnailPreview();
      return;
    }
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
      ) {
        hideThumbnailPreview();
        return;
      }
      showThumbnailPreview(url);
    } catch {
      hideThumbnailPreview();
    }
  });
  thumbImage?.addEventListener("error", () => {
    hideThumbnailPreview();
  });
  /* =======================================================
     CLEAR INVALID STATE
     ======================================================= */
  [
    title,
    slug,
    price,
    thumb,
    type,
    access,
    desc,
    content
  ].forEach((element) => {
    element?.addEventListener("input", () => {
      clearInvalid(element);
    });
    element?.addEventListener("change", () => {
      clearInvalid(element);
    });
  });
  /* =======================================================
     VALIDATION
     ======================================================= */
  const validate = () => {
    const productTitle =
      String(title?.value || "").trim();
    const productSlug =
      normalizeSlug(slug?.value);
    const productType =
      String(type?.value || "");
    const productAccess =
      String(access?.value || "");
    const amount =
      Number(price?.value || 0);
    if (
      !productTitle ||
      productTitle.length < 2
    ) {
      markInvalid(title);
      toast(
        "Judul produk minimal 2 karakter.",
        "error"
      );
      return null;
    }
    if (productTitle.length > 120) {
      markInvalid(title);
      toast(
        "Judul produk terlalu panjang.",
        "error"
      );
      return null;
    }
    if (
      !productSlug ||
      productSlug.length < 3
    ) {
      markInvalid(slug);
      toast(
        "Slug minimal 3 karakter.",
        "error"
      );
      return null;
    }
    if (!/^[a-z0-9-]+$/.test(productSlug)) {
      markInvalid(slug);
      toast(
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda -.",
        "error"
      );
      return null;
    }
    if (!VALID_TYPES.includes(productType)) {
      markInvalid(type);
      toast(
        "Tipe produk tidak valid.",
        "error"
      );
      return null;
    }
    if (!VALID_ACCESS.includes(productAccess)) {
      markInvalid(access);
      toast(
        "Jenis akses tidak valid.",
        "error"
      );
      return null;
    }
    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      markInvalid(price);
      toast(
        "Harga produk tidak valid.",
        "error"
      );
      return null;
    }
    if (
      productAccess === "paid" &&
      amount <= 0
    ) {
      markInvalid(price);
      toast(
        "Produk berbayar harus memiliki harga.",
        "error"
      );
      return null;
    }
    return {
      title: productTitle,
      slug: productSlug,
      price:
        productAccess === "free"
          ? 0
          : Math.max(0, amount),
      thumbnail_url:
        String(thumb?.value || "").trim() || null,
      type: productType,
      access_type: productAccess,
      description:
        String(desc?.value || "").trim(),
      content:
        String(content?.value || "")
    };
  };
  /* =======================================================
     SUBMIT
     ======================================================= */
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const product = validate();
    if (!product) return;
    try {
      setSubmitting(true);
      /* -----------------------------------------------
         AUTH
         ----------------------------------------------- */
      if (!window.TC?.user) {
        toast(
          "Sistem autentikasi belum siap.",
          "error"
        );
        return;
      }
      const user = await TC.user();
      if (!user) {
        location.replace("login.html");
        return;
      }
      /* -----------------------------------------------
         SUPABASE
         ----------------------------------------------- */
      if (!window.sb) {
        toast(
          "Database belum terkonfigurasi.",
          "error"
        );
        return;
      }
      /* -----------------------------------------------
         PAYLOAD
         ----------------------------------------------- */
      const payload = {
        seller_id: user.id,
        creator_id: user.id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        thumbnail_url:
          product.thumbnail_url,
        type: product.type,
        access_type:
          product.access_type,
        description:
          product.description,
        content:
          product.content,
        status: "published"
      };
      /* -----------------------------------------------
         INSERT
         ----------------------------------------------- */
      const { error } =
        await sb
          .from("products")
          .insert(payload);
      if (error) {
        console.error(
          "Create product error:",
          error
        );
        if (error.code === "23505") {
          toast(
            "Slug sudah digunakan. Pilih slug lain.",
            "error"
          );
          markInvalid(slug);
          return;
        }
        if (
          error.code === "23514"
        ) {
          toast(
            "Data produk tidak memenuhi aturan database.",
            "error"
          );
          return;
        }
        if (
          error.code === "23503"
        ) {
          toast(
            "Data akun atau relasi produk tidak valid.",
            "error"
          );
          return;
        }
        toast(
          error.message ||
          "Gagal membuat produk.",
          "error"
        );
        return;
      }
      /* -----------------------------------------------
         SUCCESS
         ----------------------------------------------- */
      toast(
        "Produk berhasil dipublikasikan ke Marketplace.",
        "success"
      );
      if (form) {
        form.reset();
      }
      slugManuallyEdited = false;
      syncPrice();
      updateDescriptionCounter();
      hideThumbnailPreview();
      setTimeout(() => {
        location.replace("my-products.html");
      }, 700);
    } catch (error) {
      console.error(
        "Unexpected create product error:",
        error
      );
      toast(
        "Terjadi kesalahan saat membuat produk.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  });
});
