/* =========================================================
   PasTele — PASTE / CREATE CENTER
   Real Supabase / Rich Text / Marketplace
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  /* =======================================================
     ELEMENTS
     ======================================================= */
  const $ = (id) => document.getElementById(id);
  const editor = $("editor");
  const form = $("create");
  const title = $("title");
  const bot = $("bot");
  const botWrap = $("botWrap");
  const botStatus = $("botStatus");
  const channelType = $("channelType");
  const ctype = $("ctype");
  const visibility = $("visibility");
  const passwordWrap = $("passwordWrap");
  const ppass = $("ppass");
  const expireWrap = $("expireWrap");
  const expire = $("expire");
  const tagsWrap = $("tagsWrap");
  const tags = $("tags");
  const privacyWrap = $("privacyWrap");
  const accessWrap = $("accessWrap");
  const access = $("access");
  const priceWrap = $("priceWrap");
  const price = $("price");
  const linkBtn = $("linkBtn");
  const spoilerBtn = $("spoiler");
  const imageInput = $("image");
  const publishBtn = $("publishBtn");
  const publishNormal = $("publishNormal");
  const publishLoading = $("publishLoading");
  const editorStatus = $("editorStatus");
  let kind = "paste";
  let currentUser = null;
  let submitting = false;
  let savedRange = null;
  const VALID_TYPES = [
    "paste",
    "code",
    "channel"
  ];
  const VALID_ACCESS = [
    "free",
    "paid"
  ];
  /* =======================================================
     HELPERS
     ======================================================= */
  const toast = (
    message,
    type = "error"
  ) => {
    if (window.TC?.toast) {
      TC.toast(message, type);
      return;
    }
    console[type === "error" ? "error" : "log"](
      message
    );
  };
  const setHidden = (
    element,
    hidden
  ) => {
    element?.classList.toggle(
      "hidden",
      hidden
    );
  };
  const markInvalid = (element) => {
    if (!element) return;
    element.classList.add("invalid");
    try {
      element.focus();
    } catch {
      /* ignore */
    }
  };
  const clearInvalid = (element) => {
    element?.classList.remove("invalid");
  };
  const setSubmitting = (state) => {
    submitting = state;
    if (!publishBtn) return;
    publishBtn.disabled = state;
    if (publishNormal) {
      publishNormal.hidden = state;
    }
    if (publishLoading) {
      publishLoading.hidden = !state;
    }
  };
  const getEditorText = () => {
    return String(
      editor?.innerText || ""
    ).trim();
  };
  const getEditorHTML = () => {
    return String(
      editor?.innerHTML || ""
    ).trim();
  };
  /* =======================================================
     AUTH
     ======================================================= */
  try {
    if (!window.TC?.user) {
      location.replace("login.html");
      return;
    }
    currentUser = await TC.user();
    if (!currentUser) {
      location.replace("login.html");
      return;
    }
  } catch (error) {
    console.error(
      "Auth error:",
      error
    );
    location.replace("login.html");
    return;
  }
  /* =======================================================
     SUPABASE CHECK
     ======================================================= */
  if (!window.sb) {
    toast(
      "Database belum terkonfigurasi.",
      "error"
    );
    if (publishBtn) {
      publishBtn.disabled = true;
    }
    return;
  }
  /* =======================================================
     SELECTION MEMORY
     ======================================================= */
  const saveSelection = () => {
    if (!editor) return;
    const selection =
      window.getSelection();
    if (!selection?.rangeCount) {
      return;
    }
    const range =
      selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }
    savedRange = range.cloneRange();
  };
  const restoreSelection = () => {
    if (!editor) return;
    editor.focus();
    const selection =
      window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    if (savedRange) {
      try {
        selection.addRange(
          savedRange
        );
      } catch {
        /* ignore stale range */
      }
    }
  };
  editor?.addEventListener(
    "keyup",
    saveSelection
  );
  editor?.addEventListener(
    "mouseup",
    saveSelection
  );
  editor?.addEventListener(
    "focus",
    saveSelection
  );
  document.addEventListener(
    "selectionchange",
    () => {
      const selection =
        window.getSelection();
      if (
        selection?.rangeCount &&
        editor &&
        editor.contains(
          selection.anchorNode
        )
      ) {
        saveSelection();
      }
    }
  );
  /* =======================================================
     EDITOR COMMAND
     ======================================================= */
  document
    .querySelectorAll(
      ".editor-tool[data-cmd]"
    )
    .forEach((button) => {
      button.addEventListener(
        "mousedown",
        (event) => {
          event.preventDefault();
        }
      );
      button.addEventListener(
        "click",
        () => {
          const command =
            button.dataset.cmd;
          if (!command || !editor) {
            return;
          }
          restoreSelection();
          try {
            if (
              command === "formatBlock"
            ) {
              document.execCommand(
                "formatBlock",
                false,
                button.dataset.value || "pre"
              );
            } else {
              document.execCommand(
                command,
                false,
                null
              );
            }
          } catch (error) {
            console.error(
              "Editor command error:",
              error
            );
          }
          saveSelection();
          updateEditorStatus();
        }
      );
    });
  /* =======================================================
     LINK
     ======================================================= */
  linkBtn?.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();
    }
  );
  linkBtn?.addEventListener(
    "click",
    () => {
      if (!editor) return;
      restoreSelection();
      const url =
        window.prompt(
          "Masukkan URL (https://...)"
        );
      if (!url) return;
      let parsed;
      try {
        parsed = new URL(
          url.trim()
        );
      } catch {
        toast(
          "URL tidak valid.",
          "error"
        );
        return;
      }
      if (
        ![
          "http:",
          "https:"
        ].includes(parsed.protocol)
      ) {
        toast(
          "Gunakan URL http atau https.",
          "error"
        );
        return;
      }
      try {
        document.execCommand(
          "createLink",
          false,
          parsed.href
        );
        saveSelection();
      } catch (error) {
        console.error(
          "Link error:",
          error
        );
      }
    }
  );
  /* =======================================================
     SPOILER
     ======================================================= */
  spoilerBtn?.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();
    }
  );
  spoilerBtn?.addEventListener(
    "click",
    () => {
      if (!editor) return;
      restoreSelection();
      const selection =
        window.getSelection();
      if (
        !selection ||
        !selection.rangeCount ||
        selection.isCollapsed
      ) {
        toast(
          "Pilih teks yang ingin dijadikan spoiler.",
          "error"
        );
        return;
      }
      const range =
        selection.getRangeAt(0);
      if (
        !editor.contains(
          range.commonAncestorContainer
        )
      ) {
        return;
      }
      const spoiler =
        document.createElement("span");
      spoiler.setAttribute(
        "data-spoiler",
        "true"
      );
      spoiler.title =
        "Klik untuk melihat";
      spoiler.appendChild(
        range.extractContents()
      );
      range.insertNode(spoiler);
      selection.removeAllRanges();
      const newRange =
        document.createRange();
      newRange.selectNodeContents(
        spoiler
      );
      selection.addRange(
        newRange
      );
      spoiler.addEventListener(
        "click",
        () => {
          spoiler.classList.toggle(
            "revealed"
          );
        }
      );
      saveSelection();
      updateEditorStatus();
    }
  );
  /* =======================================================
     IMAGE
     ======================================================= */
  imageInput?.addEventListener(
    "change",
    () => {
      const file =
        imageInput.files?.[0];
      if (!file) return;
      const MAX_IMAGE_SIZE =
        5 * 1024 * 1024;
      if (file.size > MAX_IMAGE_SIZE) {
        toast(
          "Ukuran gambar maksimal 5 MB.",
          "error"
        );
        imageInput.value = "";
        return;
      }
      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        toast(
          "File yang dipilih bukan gambar.",
          "error"
        );
        imageInput.value = "";
        return;
      }
      const reader =
        new FileReader();
      reader.onload = () => {
        restoreSelection();
        try {
          document.execCommand(
            "insertImage",
            false,
            reader.result
          );
          saveSelection();
          updateEditorStatus();
        } catch (error) {
          console.error(
            "Image insert error:",
            error
          );
          toast(
            "Gagal memasukkan gambar.",
            "error"
          );
        }
        imageInput.value = "";
      };
      reader.onerror = () => {
        toast(
          "Gagal membaca gambar.",
          "error"
        );
        imageInput.value = "";
      };
      reader.readAsDataURL(file);
    }
  );
  /* =======================================================
     EDITOR STATUS
     ======================================================= */
  const updateEditorStatus = () => {
    if (!editorStatus || !editor) {
      return;
    }
    const text =
      editor.innerText || "";
    const count =
      text.trim().length;
    editorStatus.textContent =
      `${count.toLocaleString("id-ID")} karakter`;
  };
  editor?.addEventListener(
    "input",
    () => {
      clearInvalid(editor);
      updateEditorStatus();
      saveSelection();
    }
  );
  updateEditorStatus();
  /* =======================================================
     APPROVED BOTS
     ======================================================= */
  const loadBots = async () => {
    if (!bot) return;
    bot.innerHTML = `
      <option value="">
        Memuat bot...
      </option>
    `;
    try {
      const {
        data,
        error
      } = await sb
        .from("approved_bots")
        .select(
          "id,bot_username,bot_name,bot_id,is_active"
        )
        .order(
          "bot_name",
          {
            ascending: true
          }
        );
      if (error) {
        throw error;
      }
      const rows =
        Array.isArray(data)
          ? data
          : [];
      bot.innerHTML = "";
      if (!rows.length) {
        bot.innerHTML = `
          <option value="">
            Tidak ada bot approved
          </option>
        `;
        if (botStatus) {
          botStatus.textContent =
            "Belum ada bot yang tersedia.";
        }
        return;
      }
      rows.forEach((item) => {
        const option =
          document.createElement(
            "option"
          );
        option.value =
          item.id ?? "";
        option.dataset.active =
          String(
            item.is_active === true
          );
        option.dataset.user =
          String(
            item.bot_username || ""
          );
        option.dataset.botId =
          String(
            item.bot_id || ""
          );
        const name =
          item.bot_name ||
          item.bot_username ||
          "Bot";
        option.textContent =
          `${name} ${
            item.is_active
              ? "✓"
              : "✕"
          }`;
        bot.appendChild(
          option
        );
      });
      updateBotStatus();
    } catch (error) {
      console.error(
        "Load approved bots error:",
        error
      );
      bot.innerHTML = `
        <option value="">
          Gagal memuat bot
        </option>
      `;
      if (botStatus) {
        botStatus.textContent =
          "Gagal mengambil daftar bot.";
      }
    }
  };
  const updateBotStatus = () => {
    if (!botStatus || !bot) {
      return;
    }
    const option =
      bot.selectedOptions?.[0];
    if (!option?.value) {
      botStatus.textContent =
        "Pilih bot Telegram.";
      return;
    }
    if (
      option.dataset.active ===
      "true"
    ) {
      botStatus.textContent =
        "✓ Bot approved dan aktif.";
    } else {
      botStatus.textContent =
        "✕ Bot belum approved atau tidak aktif.";
    }
  };
  bot?.addEventListener(
    "change",
    updateBotStatus
  );
  await loadBots();
  /* =======================================================
     PRICE UI
     ======================================================= */
  const syncPrice = () => {
    if (!access || !price) {
      return;
    }
    const paid =
      access.value === "paid";
    setHidden(
      priceWrap,
      !paid
    );
    price.required =
      paid;
    if (!paid) {
      price.value = "0";
      clearInvalid(price);
    }
  };
  access?.addEventListener(
    "change",
    syncPrice
  );
  price?.addEventListener(
    "input",
    () => {
      clearInvalid(price);
      const amount =
        Number(price.value);
      if (
        Number.isFinite(amount) &&
        amount < 0
      ) {
        price.value = "0";
      }
    }
  );
  /* =======================================================
     UI BY TYPE
     ======================================================= */
  const updateTypeUI = () => {
    document.body.dataset.createType = kind;
    const isPaste =
      kind === "paste";
    const isCode =
      kind === "code";
    const isChannel =
      kind === "channel";
    setHidden(
      botWrap,
      !isCode
    );
    setHidden(
      channelType,
      !isChannel
    );
    setHidden(
      privacyWrap,
      !isPaste
    );
    setHidden(
      passwordWrap,
      !isPaste
    );
    setHidden(
      expireWrap,
      !isPaste
    );
    setHidden(
      tagsWrap,
      !isPaste
    );
    setHidden(
      accessWrap,
      !(isCode || isChannel)
    );
    setHidden(
      priceWrap,
      !(
        (isCode || isChannel) &&
        access?.value === "paid"
      )
    );
    if (
      isCode ||
      isChannel
    ) {
      syncPrice();
    }
    if (isPaste) {
      clearInvalid(
        access
      );
      clearInvalid(
        price
      );
    }
  };
  /* =======================================================
     TYPE TABS
     ======================================================= */
  document
    .querySelectorAll(
      "#types [data-type]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const nextKind =
            button.dataset.type;
          if (
            !VALID_TYPES.includes(
              nextKind
            )
          ) {
            return;
          }
          kind = nextKind;
          document.body.dataset.createType = kind;
          document
            .querySelectorAll(
              "#types [data-type]"
            )
            .forEach((item) => {
              const active =
                item === button;
              item.classList.toggle(
                "active",
                active
              );
              item.setAttribute(
                "aria-selected",
                String(active)
              );
            });
          updateTypeUI();
        }
      );
    });
  updateTypeUI();
  /* =======================================================
     VISIBILITY
     ======================================================= */
  visibility?.addEventListener(
    "change",
    () => {
      clearInvalid(
        visibility
      );
      if (
        visibility.value ===
        "public"
      ) {
        ppass.value = "";
      }
    }
  );
  /* =======================================================
     VALIDATION
     ======================================================= */
  const validatePaste = () => {
    const productTitle =
      String(
        title?.value || ""
      ).trim();
    const text =
      getEditorText();
    const html =
      getEditorHTML();
    if (
      !productTitle ||
      productTitle.length < 2
    ) {
      markInvalid(title);
      toast(
        "Judul minimal 2 karakter.",
        "error"
      );
      return null;
    }
    if (
      productTitle.length > 160
    ) {
      markInvalid(title);
      toast(
        "Judul terlalu panjang.",
        "error"
      );
      return null;
    }
    if (!text) {
      markInvalid(editor);
      toast(
        "Content tidak boleh kosong.",
        "error"
      );
      return null;
    }
    if (!html) {
      markInvalid(editor);
      toast(
        "Content tidak valid.",
        "error"
      );
      return null;
    }
    return {
      title:
        productTitle,
      html,
      text
    };
  };
  const validateMarketplace = () => {
    const product =
      validatePaste();
    if (!product) {
      return null;
    }
    if (
      !VALID_ACCESS.includes(
        access?.value
      )
    ) {
      markInvalid(access);
      toast(
        "Jenis akses tidak valid.",
        "error"
      );
      return null;
    }
    const amount =
      Number(
        price?.value || 0
      );
    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      markInvalid(price);
      toast(
        "Harga tidak valid.",
        "error"
      );
      return null;
    }
    if (
      access.value === "paid" &&
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
      ...product,
      accessType:
        access.value,
      price:
        access.value === "paid"
          ? amount
          : 0
    };
  };
  /* =======================================================
     PUBLISH PASTE
     ======================================================= */
  const publishPaste = async (
    product
  ) => {
    const slug =
      crypto.randomUUID()
        .replaceAll("-", "")
        .slice(0, 12);
    let expiresAt = null;
    if (
      expire?.value &&
      expire.value !== "never"
    ) {
      const days =
        Number(
          expire.value.replace(
            "d",
            ""
          )
        );
      if (
        !Number.isFinite(days) ||
        days <= 0
      ) {
        throw new Error(
          "Masa expired tidak valid."
        );
      }
      const date =
        new Date();
      date.setDate(
        date.getDate() + days
      );
      expiresAt =
        date.toISOString();
    }
    const tagList =
      String(
        tags?.value || ""
      )
        .split(",")
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
        .slice(0, 30);
    const payload = {
      user_id:
        currentUser.id,
      slug,
      title:
        product.title,
      content_html:
        product.html,
      visibility:
        visibility?.value ||
        "public",
      expires_at:
        expiresAt,
      description:
        "",
      tags:
        tagList,
      allow_comments:
        true,
      allow_download:
        true,
      show_raw:
        true,
      anonymous:
        false
    };
    const {
      error
    } = await sb
      .from("pastelinks")
      .insert(payload);
    if (error) {
      throw error;
    }
    return slug;
  };
  /* =======================================================
     PUBLISH CODE
     ======================================================= */
  const publishCode = async (
    product
  ) => {
    const option =
      bot?.selectedOptions?.[0];
    if (
      !option ||
      !option.value
    ) {
      markInvalid(bot);
      throw new Error(
        "Pilih bot Telegram terlebih dahulu."
      );
    }
    if (
      option.dataset.active !==
      "true"
    ) {
      markInvalid(bot);
      throw new Error(
        "Bot belum approved atau tidak aktif oleh admin."
      );
    }
    const payload = {
      owner_id:
        currentUser.id,
      title:
        product.title,
      description:
        product.text,
      product_type:
        "code",
      access_type:
        product.accessType,
      price:
        product.price,
      bot_username:
        option.dataset.user ||
        null,
      telegram_bot_id:
        option.dataset.botId ||
        null,
      content:
        product.html,
      is_published:
        true
    };
    const {
      error
    } = await sb
      .from("telegram_products")
      .insert(payload);
    if (error) {
      throw error;
    }
  };
  /* =======================================================
     PUBLISH CHANNEL / GROUP
     ======================================================= */
  const publishChannel = async (
    product
  ) => {
    const telegramContent =
      product.text;
    if (!telegramContent) {
      markInvalid(editor);
      throw new Error(
        "Masukkan username atau ID Channel/Group di Content."
      );
    }
    const telegramType =
      ctype?.value === "group"
        ? "group"
        : "channel";
    const payload = {
      owner_id:
        currentUser.id,
      name:
        product.title,
      username:
        null,
      type:
        telegramType,
      access_type:
        product.accessType,
      price:
        product.price,
      telegram_channel_id:
        telegramContent,
      is_published:
        true
    };
    const {
      error
    } = await sb
      .from("telegram_channels")
      .insert(payload);
    if (error) {
      throw error;
    }
  };
  /* =======================================================
     FORM SUBMIT
     ======================================================= */
  form?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (submitting) {
        return;
      }
      if (!currentUser) {
        location.replace(
          "login.html"
        );
        return;
      }
      let product = null;
      try {
        if (kind === "paste") {
          product =
            validatePaste();
        } else {
          product =
            validateMarketplace();
        }
        if (!product) {
          return;
        }
        setSubmitting(true);
        if (kind === "paste") {
          const slug =
            await publishPaste(
              product
            );
          toast(
            "PasteLink berhasil dipublikasikan.",
            "success"
          );
          setTimeout(() => {
            location.href =
              "paste-view.html?slug=" +
              encodeURIComponent(
                slug
              );
          }, 650);
          return;
        }
        if (kind === "code") {
          await publishCode(
            product
          );
          toast(
            "Code berhasil dipublikasikan ke Marketplace.",
            "success"
          );
          setTimeout(() => {
            location.href =
              "dashboard.html";
          }, 650);
          return;
        }
        if (kind === "channel") {
          await publishChannel(
            product
          );
          toast(
            "Channel/Group berhasil dipublikasikan ke Marketplace.",
            "success"
          );
          setTimeout(() => {
            location.href =
              "dashboard.html";
          }, 650);
          return;
        }
        throw new Error(
          "Jenis konten tidak valid."
        );
      } catch (error) {
        console.error(
          "Publish error:",
          error
        );
        const code =
          error?.code || "";
        if (code === "23505") {
          toast(
            "Data tersebut sudah digunakan. Silakan gunakan data lain.",
            "error"
          );
        } else if (code === "23503") {
          toast(
            "Data akun atau relasi database tidak valid.",
            "error"
          );
        } else if (code === "23514") {
          toast(
            "Data tidak memenuhi aturan database.",
            "error"
          );
        } else {
          toast(
            error?.message ||
            "Gagal mempublikasikan konten.",
            "error"
          );
        }
      } finally {
        setSubmitting(false);
      }
    }
  );
});
