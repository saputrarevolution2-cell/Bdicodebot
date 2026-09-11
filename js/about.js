/* =========================================================
   PasTele · About
   about.js
   Page-only JavaScript
   ========================================================= */

(() => {

  "use strict";


  /* =======================================================
     CONSTANTS
     ======================================================= */

  const PAGE_SELECTOR = ".about-page";

  let initialized = false;


  /* =======================================================
     INIT
     ======================================================= */

  const initAbout = () => {

    if (initialized) return;

    const page =
      document.querySelector(PAGE_SELECTOR);

    if (!page) return;

    initialized = true;

    page.dataset.aboutReady = "1";


    setupReveal(page);

    setupTilt(page);

    setupInteractiveCards(page);

    setupThemeSync(page);

    setupCurrentYear();

  };


  /* =======================================================
     SCROLL REVEAL
     ======================================================= */

  const setupReveal = (page) => {

    const elements =
      page.querySelectorAll("[data-reveal]");

    if (!elements.length) return;


    /*
     * Reduced motion:
     * tampilkan langsung.
     */

    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {

      elements.forEach((element) => {
        element.classList.add("is-visible");
      });

      return;
    }


    /*
     * IntersectionObserver
     */

    if ("IntersectionObserver" in window) {

      const observer =
        new IntersectionObserver(
          (entries, obs) => {

            entries.forEach((entry) => {

              if (!entry.isIntersecting) {
                return;
              }

              entry.target.classList.add(
                "is-visible"
              );

              obs.unobserve(
                entry.target
              );

            });

          },
          {
            threshold: 0.12,
            rootMargin: "0px 0px -35px 0px"
          }
        );


      elements.forEach((element) => {

        observer.observe(element);

      });


      return;
    }


    /*
     * Fallback browser lama
     */

    elements.forEach((element) => {

      element.classList.add(
        "is-visible"
      );

    });

  };


  /* =======================================================
     PRODUCT WINDOW TILT
     ======================================================= */

  const setupTilt = (page) => {

    const windowCard =
      page.querySelector(
        ".about-product-window"
      );

    if (!windowCard) return;


    /*
     * Jangan pakai tilt di mobile.
     */

    const isMobile =
      window.matchMedia &&
      window.matchMedia(
        "(max-width: 680px)"
      ).matches;

    if (isMobile) return;


    /*
     * Reduced motion.
     */

    if (
      window.matchMedia &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }


    let frame = null;


    const handleMove = (event) => {

      const rect =
        windowCard.getBoundingClientRect();

      const x =
        event.clientX - rect.left;

      const y =
        event.clientY - rect.top;


      const rotateY =
        ((x / rect.width) - .5) * 6;

      const rotateX =
        ((y / rect.height) - .5) * -5;


      if (frame) {
        cancelAnimationFrame(frame);
      }


      frame =
        requestAnimationFrame(() => {

          windowCard.style.transform =
            `perspective(1100px)
             rotateY(${rotateY}deg)
             rotateX(${rotateX}deg)
             translateY(-3px)`;

        });

    };


    const reset =
      () => {

        if (frame) {
          cancelAnimationFrame(frame);
        }

        windowCard.style.transform =
          "perspective(1100px) rotateY(-5deg) rotateX(3deg)";

      };


    windowCard.addEventListener(
      "mousemove",
      handleMove,
      { passive: true }
    );


    windowCard.addEventListener(
      "mouseleave",
      reset
    );

  };


  /* =======================================================
     CARD INTERACTIONS
     ======================================================= */

  const setupInteractiveCards = (page) => {

    const cards =
      page.querySelectorAll(
        ".about-feature-card, .about-legal-card"
      );


    cards.forEach((card) => {

      card.addEventListener(
        "mouseenter",
        () => {

          card.classList.add(
            "is-hovered"
          );

        }
      );


      card.addEventListener(
        "mouseleave",
        () => {

          card.classList.remove(
            "is-hovered"
          );

        }
      );

    });

  };


  /* =======================================================
     THEME SYNC
     ======================================================= */

  const setupThemeSync = (page) => {

    const sync = () => {

      const theme =
        document.documentElement.dataset.theme ||
        "light";

      page.dataset.theme = theme;

    };


    sync();


    window.addEventListener(
      "pastele-theme-change",
      sync
    );

  };


  /* =======================================================
     YEAR
     ======================================================= */

  const setupCurrentYear = () => {

    document
      .querySelectorAll(
        "[data-current-year]"
      )
      .forEach((element) => {

        element.textContent =
          String(
            new Date().getFullYear()
          );

      });

  };


  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initAbout,
      {
        once: true
      }
    );

  } else {

    initAbout();

  }

})();
