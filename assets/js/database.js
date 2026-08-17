// =====================================================
// TELECOD - SUPABASE DATABASE
// =====================================================

const SUPABASE_URL =
    "https://qrhbgffmqorzbcfvnbkk.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJxcmhiZ2ZmbXFvcnpiY2Z2bmJrayIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2OTUxMzkyLCJleHAiOjIxMDI1MjczOTJ9.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";


// =====================================================
// CHECK SUPABASE LIBRARY
// =====================================================

if (!window.supabase) {

    console.error(
        "Supabase JS belum dimuat."
    );

    throw new Error(
        "Supabase library belum tersedia."
    );

}


// =====================================================
// CREATE CLIENT
// =====================================================

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        }
    }
);


// =====================================================
// GET SESSION
// =====================================================

async function getCurrentSession() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {

            console.error(
                "GET SESSION ERROR:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "SESSION EXCEPTION:",
            error
        );

        return null;
    }

}


// =====================================================
// GET USER
// =====================================================

async function getCurrentUser() {

    try {

        const {
            data,
            error
        } = await supabase.auth.getUser();

        if (error) {

            console.error(
                "GET USER ERROR:",
                error
            );

            return null;
        }

        return data?.user || null;

    } catch (error) {

        console.error(
            "USER EXCEPTION:",
            error
        );

        return null;
    }

}


// =====================================================
// LOGOUT
// =====================================================

async function logoutUser() {

    try {

        const {
            error
        } = await supabase.auth.signOut();

        if (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

            return false;
        }

        localStorage.removeItem(
            "telecod_logged_in"
        );

        return true;

    } catch (error) {

        console.error(
            "LOGOUT EXCEPTION:",
            error
        );

        return false;
    }

}


// =====================================================
// AUTH STATE
// =====================================================

supabase.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "TELECOD AUTH:",
            event,
            session?.user?.email || null
        );

    }
);
