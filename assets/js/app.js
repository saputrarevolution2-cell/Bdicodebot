// =====================================================
// TELECOD APP.JS
// =====================================================


// =====================================================
// MOBILE MENU
// =====================================================

const mobileToggle = document.getElementById("mobileToggle");
const mobileMenu = document.getElementById("mobileMenu");

mobileToggle?.addEventListener("click", () => {

    mobileMenu?.classList.toggle("show");

    const icon = mobileToggle.querySelector("i");

    if (icon) {

        icon.className =
            mobileMenu?.classList.contains("show")
                ? "fa-solid fa-xmark"
                : "fa-solid fa-bars";

    }

});


// Close mobile menu

document.querySelectorAll("#mobileMenu a").forEach(link => {

    link.addEventListener("click", () => {

        mobileMenu?.classList.remove("show");

        const icon =
            mobileToggle?.querySelector("i");

        if (icon) {
            icon.className = "fa-solid fa-bars";
        }

    });

});


// =====================================================
// LANGUAGE SYSTEM
// =====================================================

const languageBtn =
    document.getElementById("languageBtn");

const languageMenu =
    document.getElementById("languageMenu");

const languageText =
    document.getElementById("languageText");


// =====================================================
// MAIN TRANSLATIONS
// =====================================================

const translations = {

    id: {

        home: "Beranda",
        marketplace: "Marketplace",
        sell: "Jual Code",
        features: "Keunggulan",
        about: "Tentang",

        login: "Masuk",
        register: "Daftar",

        heroBadge:
            "Telegram Bot Code Marketplace",

        heroTitle1:
            "Temukan & Jual",

        heroDescription:
            "Marketplace modern untuk membeli, menjual, dan mengembangkan code bot Telegram dengan cepat, aman, dan terpercaya.",

        explore:
            "Jelajahi Marketplace",

        sellNow:
            "Jual Code Sekarang"

    },

    en: {

        home: "Home",
        marketplace: "Marketplace",
        sell: "Sell Code",
        features: "Features",
        about: "About",

        login: "Login",
        register: "Register",

        heroBadge:
            "Telegram Bot Code Marketplace",

        heroTitle1:
            "Discover & Sell",

        heroDescription:
            "A modern marketplace to buy, sell, and develop Telegram bot code quickly, securely, and reliably.",

        explore:
            "Explore Marketplace",

        sellNow:
            "Sell Code Now"

    }

};


// =====================================================
// FULL PAGE TRANSLATIONS
// =====================================================

const pageTranslations = {

    "Beranda": "Home",
    "Jual Code": "Sell Code",
    "Keunggulan": "Features",
    "Tentang": "About",
    "Masuk": "Login",
    "Daftar": "Register",

    "Populer": "Popular",
    "Terbaru": "Latest",
    "Premium": "Premium",
    "Payment": "Payment",
    "File Bot": "File Bot",
    "Game Bot": "Game Bot",
    "Utility": "Utility",
    "Group": "Group",
    "Channel": "Channel",

    "Aman": "Secure",
    "Cepat": "Fast",
    "Terpercaya": "Trusted",

    "Code": "Code",
    "Seller": "Seller",
    "Transaksi": "Transactions",
    "Member": "Members",

    "TRENDING": "TRENDING",
    "Code Populer": "Popular Code",
    "Lihat Semua": "View All",

    "Statistik": "Statistics",
    "Statistik TeleCod": "TeleCod Statistics",
    "Code Tersedia": "Available Code",
    "Seller Aktif": "Active Sellers",

    "WHY TELECOD": "WHY TELECOD",

    "Kenapa pilih": "Why choose",

    "Aman & Terpercaya":
        "Safe & Trusted",

    "Proses Cepat":
        "Fast Process",

    "Quality Code":
        "Quality Code",

    "Telegram Ready":
        "Telegram Ready",

    "Dibangun untuk developer, seller, dan pengguna Telegram.":
        "Built for developers, sellers, and Telegram users.",

    "Cara Kerja":
        "How It Works",

    "SIMPLE PROCESS":
        "SIMPLE PROCESS",

    "Cari Code":
        "Find Code",

    "Temukan code sesuai kebutuhanmu.":
        "Find the code that suits your needs.",

    "Beli":
        "Buy",

    "Lakukan pembayaran melalui metode tersedia.":
        "Complete the payment using an available method.",

    "Download":
        "Download",

    "Dapatkan code setelah transaksi berhasil.":
        "Get the code after the transaction is completed.",

    "Deploy":
        "Deploy",

    "Jalankan dan kembangkan bot Telegram.":
        "Run and develop your Telegram bot.",

    "AGE RESTRICTED":
        "AGE RESTRICTED",

    "Code 18+":
        "18+ Code",

    "Kategori khusus pengguna dewasa. Akses membutuhkan verifikasi usia.":
        "A special category for adult users. Access requires age verification.",

    "Masuk Kategori 18+":
        "Enter 18+ Category",

    "Adult Bot":
        "Adult Bot",

    "Premium Adult":
        "Premium Adult",

    "Private Bot":
        "Private Bot",

    "Adult Game":
        "Adult Game",

    "Premium Content":
        "Premium Content",

    "18+ Only":
        "18+ Only",

    "FOR DEVELOPERS":
        "FOR DEVELOPERS",

    "Punya Code Bot?":
        "Have a Bot Code?",

    "Jual di TeleCod.":
        "Sell it on TeleCod.",

    "Upload code bot Telegram milikmu, tampilkan di marketplace, dan mulai mendapatkan penghasilan.":
        "Upload your Telegram bot code, list it on the marketplace, and start earning.",

    "Mulai Jual Code":
        "Start Selling Code",

    "Code uploaded":
        "Code uploaded",

    "Bot verified":
        "Bot verified",

    "Listing approved":
        "Listing approved",

    "ABOUT TELECOD":
        "ABOUT TELECOD",

    "Marketplace untuk":
        "Marketplace for",

    "Code Telegram.":
        "Telegram Code.",

    "TeleCod dibuat untuk mempertemukan developer dan pengguna Telegram dalam satu marketplace code bot.":
        "TeleCod was created to connect developers and Telegram users in one bot code marketplace.",

    "Kami ingin membuat proses menemukan, membeli, dan menjual code menjadi lebih mudah dan modern.":
        "We want to make finding, buying, and selling code easier and more modern.",

    "Marketplace khusus code bot":
        "Marketplace dedicated to bot code",

    "Sistem verifikasi listing":
        "Listing verification system",

    "Seller dan buyer terorganisir":
        "Organized sellers and buyers",

    "READY TO START?":
        "READY TO START?",

    "Bangun sesuatu yang":
        "Build something",

    "lebih besar.":
        "bigger.",

    "Temukan code berikutnya atau mulai jual code bot buatanmu.":
        "Find your next code or start selling your own bot code.",

    "Marketplace":
        "Marketplace",

    "Jual Code":
        "Sell Code",

    "Semua Code":
        "All Code",

    "Panduan Seller":
        "Seller Guide",

    "Pendapatan":
        "Earnings",

    "Verifikasi":
        "Verification",

    "Bantuan":
        "Help",

    "FAQ":
        "FAQ",

    "Contact":
        "Contact",

    "Report Code":
        "Report Code",

    "Community":
        "Community",

    "Legal":
        "Legal",

    "Terms of Service":
        "Terms of Service",

    "Privacy Policy":
        "Privacy Policy",

    "Refund Policy":
        "Refund Policy",

    "18+ Policy":
        "18+ Policy",

    "Newsletter":
        "Newsletter",

    "Dapatkan informasi terbaru dari TeleCod.":
        "Get the latest information from TeleCod.",

    "Email kamu...":
        "Your email...",

    "Made with":
        "Made with",

    "for Telegram Community":
        "for Telegram Community",

    "Konten 18+":
        "18+ Content",

    "Kategori ini hanya untuk pengguna yang memenuhi batas usia yang berlaku.":
        "This category is only for users who meet the applicable age requirement.",

    "Saya memenuhi batas usia":
        "I meet the age requirement",

    "Kembali":
        "Back"

};


// =====================================================
// PRODUCT TRANSLATIONS
// =====================================================

const productTranslations = {

    "Payment Bot Pro":
        "Payment Bot Pro",

    "Bot pembayaran Telegram dengan sistem otomatis.":
        "Telegram payment bot with an automated payment system.",

    "File Manager Bot":
        "File Manager Bot",

    "Bot management file dan penyimpanan Telegram.":
        "File management and Telegram storage bot.",

    "Telegram Store":
        "Telegram Store",

    "Sistem toko online langsung melalui Telegram.":
        "Online store system directly through Telegram.",

    "AI Assistant Bot":
        "AI Assistant Bot",

    "Telegram bot dengan integrasi AI.":
        "Telegram bot with AI integration.",

    "BEST SELLER":
        "BEST SELLER",

    "POPULER":
        "POPULAR",

    "PREMIUM":
        "PREMIUM",

    "Detail":
        "Details"

};


// =====================================================
// STORE ORIGINAL TEXT
// =====================================================

const originalTextNodes =
    new Map();


// =====================================================
// GET NORMAL TEXT
// =====================================================

function normalizeText(text) {

    return text
        .replace(/\s+/g, " ")
        .trim();

}


// =====================================================
// SAVE ORIGINAL TEXT
// =====================================================

function collectOriginalText() {

    const walker =
        document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT
        );

    while (walker.nextNode()) {

        const node =
            walker.currentNode;

        if (!originalTextNodes.has(node)) {

            originalTextNodes.set(
                node,
                node.nodeValue
            );

        }

    }

}


// =====================================================
// TRANSLATE NORMAL TEXT
// =====================================================

function translateNormalText(lang) {

    originalTextNodes.forEach(
        (originalValue, node) => {

            const original =
                normalizeText(originalValue);

            if (!original) return;


            // Indonesia = restore original

            if (lang === "id") {

                node.nodeValue =
                    originalValue;

                return;

            }


            // English

            const translated =
                pageTranslations[original] ||
                productTranslations[original];


            if (!translated) return;


            const leading =
                originalValue.match(/^\s*/)?.[0] || "";

            const trailing =
                originalValue.match(/\s*$/)?.[0] || "";


            node.nodeValue =
                leading +
                translated +
                trailing;

        }
    );

}


// =====================================================
// DATA-I18N TRANSLATION
// =====================================================

function translateI18n(lang) {

    const data =
        translations[lang];

    if (!data) return;


    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key =
                element.dataset.i18n;

            if (data[key]) {

                element.textContent =
                    data[key];

            }

        });

}


// =====================================================
// PLACEHOLDER TRANSLATION
// =====================================================

function translatePlaceholders(lang) {

    document
        .querySelectorAll("input[placeholder]")
        .forEach(input => {

            if (lang === "en") {

                if (
                    input.placeholder ===
                    "Email kamu..."
                ) {

                    input.placeholder =
                        "Your email...";

                }

            } else {

                input.placeholder =
                    "Email kamu...";

            }

        });

}


// =====================================================
// LANGUAGE SET
// =====================================================

function setLanguage(lang) {

    if (!translations[lang]) {

        lang = "id";

    }


    // Translate normal HTML text

    translateNormalText(lang);


    // Translate data-i18n

    translateI18n(lang);


    // Translate placeholders

    translatePlaceholders(lang);


    // HTML language

    document.documentElement.lang =
        lang;


    // Language button

    if (languageText) {

        languageText.textContent =
            lang === "id"
                ? "ID"
                : "EN";

    }


    // Save

    localStorage.setItem(
        "telecod_language",
        lang
    );


    // Close menu

    languageMenu?.classList.remove("show");

}


// =====================================================
// LANGUAGE MENU
// =====================================================

languageBtn?.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        languageMenu?.classList.toggle("show");

    }
);


// =====================================================
// LANGUAGE OPTIONS
// =====================================================

document
    .querySelectorAll("[data-lang]")
    .forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                setLanguage(
                    button.dataset.lang
                );

            }
        );

    });


// =====================================================
// FOOTER LANGUAGE
// =====================================================

document
    .querySelectorAll(".footer-language button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const text =
                    button.textContent
                        .trim();

                if (text.includes("ID")) {

                    setLanguage("id");

                }

                if (text.includes("EN")) {

                    setLanguage("en");

                }

            }
        );

    });


// =====================================================
// CLOSE LANGUAGE MENU
// =====================================================

document.addEventListener(
    "click",
    event => {

        if (
            !languageBtn?.contains(
                event.target
            ) &&
            !languageMenu?.contains(
                event.target
            )
        ) {

            languageMenu?.classList.remove(
                "show"
            );

        }

    }
);


// =====================================================
// INITIAL LANGUAGE
// =====================================================

// IMPORTANT:
// Ambil semua text sebelum bahasa diubah.

collectOriginalText();


const savedLanguage =
    localStorage.getItem(
        "telecod_language"
    ) || "id";


setLanguage(savedLanguage);


// =====================================================
// STAT COUNTER
// =====================================================

const counters =
    document.querySelectorAll(
        "[data-count]"
    );


const counterObserver =
    new IntersectionObserver(
        (entries, observer) => {

            entries.forEach(entry => {

                if (!entry.isIntersecting)
                    return;


                const counter =
                    entry.target;


                const target =
                    Number(
                        counter.dataset.count
                    );


                const duration = 1600;

                const start =
                    performance.now();


                function update(time) {

                    const progress =
                        Math.min(
                            (time - start) /
                            duration,
                            1
                        );


                    const eased =
                        1 -
                        Math.pow(
                            1 - progress,
                            3
                        );


                    const current =
                        Math.floor(
                            target * eased
                        );


                    counter.textContent =
                        current.toLocaleString(
                            "id-ID"
                        );


                    if (progress < 1) {

                        requestAnimationFrame(
                            update
                        );

                    } else {

                        counter.textContent =
                            target.toLocaleString(
                                "id-ID"
                            ) + "+";

                    }

                }


                requestAnimationFrame(
                    update
                );


                observer.unobserve(
                    counter
                );

            });

        },
        {
            threshold: 0.5
        }
    );


counters.forEach(counter => {

    counterObserver.observe(
        counter
    );

});


// =====================================================
// ADULT SLIDER
// =====================================================

const adultSlider =
    document.getElementById(
        "adultSlider"
    );


const adultNext =
    document.getElementById(
        "adultNext"
    );


const adultPrev =
    document.getElementById(
        "adultPrev"
    );


adultNext?.addEventListener(
    "click",
    () => {

        adultSlider?.scrollBy({

            left: 180,

            behavior: "smooth"

        });

    }
);


adultPrev?.addEventListener(
    "click",
    () => {

        adultSlider?.scrollBy({

            left: -180,

            behavior: "smooth"

        });

    }
);


// =====================================================
// AGE MODAL
// =====================================================

const ageModal =
    document.getElementById(
        "ageModal"
    );


const ageGate =
    document.getElementById(
        "ageGate"
    );


const closeAge =
    document.getElementById(
        "closeAge"
    );


const cancelAge =
    document.getElementById(
        "cancelAge"
    );


const confirmAge =
    document.getElementById(
        "confirmAge"
    );


function openAgeModal() {

    ageModal?.classList.add(
        "show"
    );

}


function closeAgeModal() {

    ageModal?.classList.remove(
        "show"
    );

}


ageGate?.addEventListener(
    "click",
    event => {

        event.preventDefault();

        openAgeModal();

    }
);


closeAge?.addEventListener(
    "click",
    closeAgeModal
);


cancelAge?.addEventListener(
    "click",
    closeAgeModal
);


confirmAge?.addEventListener(
    "click",
    () => {

        localStorage.setItem(
            "telecod_age_verified",
            "true"
        );


        closeAgeModal();


        alert(
            "Verifikasi usia berhasil. Kategori 18+ siap diakses."
        );

    }
);


// =====================================================
// SCROLL REVEAL
// =====================================================

const revealElements =
    document.querySelectorAll(
        ".product-card, " +
        ".feature-card, " +
        ".stat-box, " +
        ".step, " +
        ".about-content, " +
        ".seller-content"
    );


revealElements.forEach(element => {

    element.style.opacity = "0";

    element.style.transform =
        "translateY(25px)";

    element.style.transition =
        "opacity .7s ease, transform .7s ease";

});


const revealObserver =
    new IntersectionObserver(
        (entries, observer) => {

            entries.forEach(entry => {

                if (!entry.isIntersecting)
                    return;


                entry.target.style.opacity =
                    "1";


                entry.target.style.transform =
                    "translateY(0)";


                observer.unobserve(
                    entry.target
                );

            });

        },
        {
            threshold: 0.12
        }
    );


revealElements.forEach(element => {

    revealObserver.observe(
        element
    );

});


// =====================================================
// NAV ACTIVE STATE
// =====================================================

const sections =
    document.querySelectorAll(
        "section[id]"
    );


const navLinks =
    document.querySelectorAll(
        ".nav-menu a"
    );


window.addEventListener(
    "scroll",
    () => {

        let current = "";


        sections.forEach(section => {

            const top =
                section.offsetTop - 120;


            if (
                window.scrollY >= top
            ) {

                current =
                    section.id;

            }

        });


        navLinks.forEach(link => {

            link.classList.remove(
                "active"
            );


            if (
                link.getAttribute(
                    "href"
                ) === "#" + current
            ) {

                link.classList.add(
                    "active"
                );

            }

        });

    }
);


// =====================================================
// PREVENT DEMO LINKS
// =====================================================

document
    .querySelectorAll(
        'a[href="#"]'
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            event => {

                event.preventDefault();

            }
        );

    });


// =====================================================
// AGE MODAL - CLICK OUTSIDE
// =====================================================

ageModal?.addEventListener(
    "click",
    event => {

        if (
            event.target === ageModal
        ) {

            closeAgeModal();

        }

    }
);
