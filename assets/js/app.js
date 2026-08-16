// =====================================================
// MOBILE MENU
// =====================================================

const mobileToggle = document.getElementById("mobileToggle");
const mobileMenu = document.getElementById("mobileMenu");

mobileToggle?.addEventListener("click", () => {

    mobileMenu.classList.toggle("show");

    const icon = mobileToggle.querySelector("i");

    if(mobileMenu.classList.contains("show")){
        icon.className = "fa-solid fa-xmark";
    }else{
        icon.className = "fa-solid fa-bars";
    }

});


// Close mobile menu when clicking link

document.querySelectorAll("#mobileMenu a").forEach(link => {

    link.addEventListener("click", () => {

        mobileMenu.classList.remove("show");

        const icon = mobileToggle.querySelector("i");

        icon.className = "fa-solid fa-bars";

    });

});


// =====================================================
// LANGUAGE
// =====================================================

const languageBtn = document.getElementById("languageBtn");
const languageMenu = document.getElementById("languageMenu");
const languageText = document.getElementById("languageText");

languageBtn?.addEventListener("click", () => {

    languageMenu.classList.toggle("show");

});


const translations = {

    id: {

        home:"Beranda",
        marketplace:"Marketplace",
        sell:"Jual Code",
        features:"Keunggulan",
        about:"Tentang",

        login:"Masuk",
        register:"Daftar",

        heroBadge:"Telegram Bot Code Marketplace",

        heroTitle1:"Temukan & Jual",

        heroDescription:
        "Marketplace modern untuk membeli, menjual, dan mengembangkan code bot Telegram dengan cepat, aman, dan terpercaya.",

        explore:"Jelajahi Marketplace",

        sellNow:"Jual Code Sekarang"

    },

    en: {

        home:"Home",
        marketplace:"Marketplace",
        sell:"Sell Code",
        features:"Features",
        about:"About",

        login:"Login",
        register:"Register",

        heroBadge:"Telegram Bot Code Marketplace",

        heroTitle1:"Discover & Sell",

        heroDescription:
        "A modern marketplace to buy, sell, and develop Telegram bot code quickly, securely, and reliably.",

        explore:"Explore Marketplace",

        sellNow:"Sell Code Now"

    }

};


function setLanguage(lang){

    const data = translations[lang];

    if(!data) return;

    document.querySelectorAll("[data-i18n]").forEach(element => {

        const key = element.dataset.i18n;

        if(data[key]){
            element.textContent = data[key];
        }

    });

    languageText.textContent =
        lang === "id" ? "ID" : "EN";

    localStorage.setItem("telecod_language",lang);

    languageMenu.classList.remove("show");

}


document.querySelectorAll("[data-lang]").forEach(button => {

    button.addEventListener("click", () => {

        setLanguage(button.dataset.lang);

    });

});


const savedLanguage =
    localStorage.getItem("telecod_language") || "id";

setLanguage(savedLanguage);


// =====================================================
// CLOSE LANGUAGE MENU
// =====================================================

document.addEventListener("click",(event)=>{

    if(
        !languageBtn?.contains(event.target) &&
        !languageMenu?.contains(event.target)
    ){

        languageMenu?.classList.remove("show");

    }

});


// =====================================================
// STAT COUNTER
// =====================================================

const counters =
    document.querySelectorAll("[data-count]");

const counterObserver =
    new IntersectionObserver((entries,observer)=>{

        entries.forEach(entry=>{

            if(!entry.isIntersecting) return;

            const counter = entry.target;

            const target =
                Number(counter.dataset.count);

            let current = 0;

            const duration = 1600;

            const start =
                performance.now();

            function update(time){

                const progress =
                    Math.min(
                        (time - start) / duration,
                        1
                    );

                const eased =
                    1 - Math.pow(1-progress,3);

                current =
                    Math.floor(target * eased);

                counter.textContent =
                    current.toLocaleString("id-ID");

                if(progress < 1){

                    requestAnimationFrame(update);

                }else{

                    counter.textContent =
                        target.toLocaleString("id-ID") + "+";

                }

            }

            requestAnimationFrame(update);

            observer.unobserve(counter);

        });

    },{
        threshold:.5
    });


counters.forEach(counter=>{
    counterObserver.observe(counter);
});


// =====================================================
// ADULT SLIDER
// =====================================================

const adultSlider =
    document.getElementById("adultSlider");

const adultNext =
    document.getElementById("adultNext");

const adultPrev =
    document.getElementById("adultPrev");


adultNext?.addEventListener("click",()=>{

    adultSlider.scrollBy({
        left:180,
        behavior:"smooth"
    });

});


adultPrev?.addEventListener("click",()=>{

    adultSlider.scrollBy({
        left:-180,
        behavior:"smooth"
    });

});


// =====================================================
// AGE MODAL
// =====================================================

const ageModal =
    document.getElementById("ageModal");

const ageGate =
    document.getElementById("ageGate");

const closeAge =
    document.getElementById("closeAge");

const cancelAge =
    document.getElementById("cancelAge");

const confirmAge =
    document.getElementById("confirmAge");


function openAgeModal(){

    ageModal.classList.add("show");

}


function closeAgeModal(){

    ageModal.classList.remove("show");

}


ageGate?.addEventListener(
    "click",
    openAgeModal
);


closeAge?.addEventListener(
    "click",
    closeAgeModal
);


cancelAge?.addEventListener(
    "click",
    closeAgeModal
);


confirmAge?.addEventListener("click",()=>{

    localStorage.setItem(
        "telecod_age_verified",
        "true"
    );

    closeAgeModal();

    alert(
        "Verifikasi usia berhasil. Kategori 18+ siap diakses."
    );

});


// =====================================================
// SCROLL REVEAL
// =====================================================

const revealElements = document.querySelectorAll(
    ".product-card, .feature-card, .stat-box, .step, .about-content, .seller-content"
);


revealElements.forEach(element=>{

    element.style.opacity = "0";

    element.style.transform =
        "translateY(25px)";

    element.style.transition =
        "opacity .7s ease, transform .7s ease";

});


const revealObserver =
    new IntersectionObserver((entries,observer)=>{

        entries.forEach(entry=>{

            if(!entry.isIntersecting) return;

            entry.target.style.opacity = "1";

            entry.target.style.transform =
                "translateY(0)";

            observer.unobserve(entry.target);

        });

    },{
        threshold:.12
    });


revealElements.forEach(element=>{
    revealObserver.observe(element);
});


// =====================================================
// NAV ACTIVE STATE
// =====================================================

const sections =
    document.querySelectorAll("section[id]");

const navLinks =
    document.querySelectorAll(".nav-menu a");


window.addEventListener("scroll",()=>{

    let current = "";

    sections.forEach(section=>{

        const top =
            section.offsetTop - 120;

        if(window.scrollY >= top){

            current = section.id;

        }

    });


    navLinks.forEach(link=>{

        link.classList.remove("active");

        if(
            link.getAttribute("href") ===
            "#" + current
        ){

            link.classList.add("active");

        }

    });

});


// =====================================================
// PREVENT DEMO LINKS
// =====================================================

document.querySelectorAll(
    'a[href="#"]'
).forEach(link=>{

    link.addEventListener("click",(event)=>{

        event.preventDefault();

    });

});
