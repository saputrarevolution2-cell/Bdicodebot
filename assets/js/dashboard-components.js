// =====================================================
// TELECOD DASHBOARD COMPONENTS
// NAVBAR + FOOTER
// =====================================================

function renderDashboardNavbar() {

    const container =
        document.getElementById("dashboard-navbar");

    if (!container) return;

    container.innerHTML = `

<header class="dashboard-navbar">

    <div class="dashboard-nav-container">

        <!-- LOGO -->

        <a href="dashboard.html" class="dashboard-logo">

            <div class="dashboard-logo-icon">
                <i class="fa-brands fa-telegram"></i>
            </div>

            <div>
                <strong>
                    Tele<span>Cod</span>
                </strong>

                <small>
                    Marketplace
                </small>
            </div>

        </a>


        <!-- MENU -->

        <nav class="dashboard-nav-menu">

            <a href="dashboard.html" class="dashboard-nav-link active">
                <i class="fa-solid fa-grid-2"></i>
                <span>Dashboard</span>
            </a>

            <a href="marketplace.html" class="dashboard-nav-link">
                <i class="fa-solid fa-store"></i>
                <span>Marketplace</span>
            </a>

            <a href="sell.html" class="dashboard-nav-link">
                <i class="fa-solid fa-code"></i>
                <span>Jual Code</span>
            </a>

            <a href="purchases.html" class="dashboard-nav-link">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>Pembelian</span>
            </a>

        </nav>


        <!-- RIGHT -->

        <div class="dashboard-nav-right">

            <!-- BALANCE -->

            <a href="wallet.html" class="dashboard-balance">

                <div class="balance-icon">
                    <i class="fa-solid fa-wallet"></i>
                </div>

                <div class="balance-info">

                    <small>Saldo</small>

                    <strong id="navBalance">
                        Rp0
                    </strong>

                </div>

            </a>


            <!-- NOTIFICATION -->

            <button
                type="button"
                class="dashboard-notification"
                id="notificationBtn"
            >

                <i class="fa-regular fa-bell"></i>

                <span
                    class="notification-badge"
                    id="notificationBadge"
                    style="display:none;"
                >
                    0
                </span>

            </button>


            <!-- PROFILE -->

            <a href="profile.html" class="dashboard-profile">

                <div class="profile-avatar">

                    <img
                        id="navAvatar"
                        src=""
                        alt="Profile"
                        style="display:none;"
                    >

                    <i
                        id="navAvatarIcon"
                        class="fa-solid fa-user"
                    ></i>

                </div>

                <div class="profile-info">

                    <strong id="navUsername">
                        User
                    </strong>

                    <small>
                        Member
                    </small>

                </div>

                <i class="fa-solid fa-chevron-down profile-arrow"></i>

            </a>


            <!-- MOBILE -->

            <button
                type="button"
                class="dashboard-mobile-toggle"
                id="dashboardMobileToggle"
            >
                <i class="fa-solid fa-bars"></i>
            </button>

        </div>

    </div>


    <!-- MOBILE MENU -->

    <div
        class="dashboard-mobile-menu"
        id="dashboardMobileMenu"
    >

        <a href="dashboard.html">
            <i class="fa-solid fa-grid-2"></i>
            Dashboard
        </a>

        <a href="marketplace.html">
            <i class="fa-solid fa-store"></i>
            Marketplace
        </a>

        <a href="sell.html">
            <i class="fa-solid fa-code"></i>
            Jual Code
        </a>

        <a href="purchases.html">
            <i class="fa-solid fa-bag-shopping"></i>
            Pembelian
        </a>

        <a href="wallet.html">
            <i class="fa-solid fa-wallet"></i>
            Wallet
        </a>

        <a href="profile.html">
            <i class="fa-solid fa-user"></i>
            Profile
        </a>

        <button
            type="button"
            id="mobileLogoutBtn"
            class="mobile-logout"
        >
            <i class="fa-solid fa-right-from-bracket"></i>
            Keluar
        </button>

    </div>

</header>

    `;


    // =================================================
    // MOBILE MENU
    // =================================================

    const toggle =
        document.getElementById(
            "dashboardMobileToggle"
        );

    const menu =
        document.getElementById(
            "dashboardMobileMenu"
        );


    toggle?.addEventListener("click", () => {

        menu?.classList.toggle("show");

        const icon =
            toggle.querySelector("i");

        if (!icon) return;

        icon.className =
            menu?.classList.contains("show")
                ? "fa-solid fa-xmark"
                : "fa-solid fa-bars";

    });


    // =================================================
    // LOGOUT
    // =================================================

    document
        .getElementById("mobileLogoutBtn")
        ?.addEventListener("click", async () => {

            if (
                typeof window.supabaseClient !==
                "undefined"
            ) {

                await window.supabaseClient.auth.signOut();

            }

            window.location.href =
                "login.html";

        });

}


// =====================================================
// FOOTER
// =====================================================

function renderDashboardFooter() {

    const container =
        document.getElementById("dashboard-footer");

    if (!container) return;

    container.innerHTML = `

<footer class="dashboard-footer">

    <div class="dashboard-footer-container">


        <!-- BRAND -->

        <div class="dashboard-footer-brand">

            <a
                href="dashboard.html"
                class="dashboard-logo"
            >

                <div class="dashboard-logo-icon">
                    <i class="fa-brands fa-telegram"></i>
                </div>

                <div>

                    <strong>
                        Tele<span>Cod</span>
                    </strong>

                    <small>
                        Telegram Bot Code Marketplace
                    </small>

                </div>

            </a>


            <p>
                Marketplace code bot Telegram
                untuk developer dan pengguna.
            </p>

        </div>


        <!-- PLATFORM -->

        <div class="dashboard-footer-column">

            <h4>Platform</h4>

            <a href="dashboard.html">
                Dashboard
            </a>

            <a href="marketplace.html">
                Marketplace
            </a>

            <a href="sell.html">
                Jual Code
            </a>

            <a href="purchases.html">
                Pembelian
            </a>

        </div>


        <!-- ACCOUNT -->

        <div class="dashboard-footer-column">

            <h4>Akun</h4>

            <a href="profile.html">
                Profile
            </a>

            <a href="wallet.html">
                Wallet
            </a>

            <a href="#">
                Pengaturan
            </a>

        </div>


        <!-- HELP -->

        <div class="dashboard-footer-column">

            <h4>Bantuan</h4>

            <a href="#">
                FAQ
            </a>

            <a href="#">
                Contact
            </a>

            <a href="#">
                Report
            </a>

        </div>


    </div>


    <div class="dashboard-footer-bottom">

        <span>
            © 2026 TeleCod. All Rights Reserved.
        </span>

        <span>
            <i class="fa-brands fa-telegram"></i>
            Telegram Bot Code Marketplace
        </span>

    </div>

</footer>

    `;

}


// =====================================================
// INIT
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderDashboardNavbar();
        renderDashboardFooter();

    }
);
