// =====================================================
// TELECOD - SUPABASE DATABASE
// =====================================================

const SUPABASE_URL =
    "https://qrhbgffmqorzbcfvnbkk.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaGJnZmZtcW9yemJjZnZuYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTEzOTIsImV4cCI6MjEwMjUyNzM5Mn0.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";


// =====================================================
// SUPABASE CLIENT
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
// GET CURRENT SESSION
// =====================================================

async function getCurrentSession() {

    const {
        data,
        error
    } = await supabase.auth.getSession();

    if (error) {
        console.error(
            "Session error:",
            error
        );

        return null;
    }

    return data.session || null;
}


// =====================================================
// GET CURRENT USER
// =====================================================

async function getCurrentUser() {

    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {
        return null;
    }

    return data.user || null;
}


// =====================================================
// GET CURRENT PROFILE
// =====================================================

async function getCurrentProfile() {

    const user =
        await getCurrentUser();

    if (!user) {
        return null;
    }

    return user;
}


// =====================================================
// LOGOUT
// =====================================================

async function logoutUser() {

    const {
        error
    } = await supabase.auth.signOut();

    if (error) {

        console.error(
            "Logout error:",
            error
        );

        return false;
    }

    return true;
}


// =====================================================
// AUTH STATE LISTENER
// =====================================================

supabase.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "AUTH EVENT:",
            event
        );

        if (session) {

            console.log(
                "USER:",
                session.user.email
            );

        }

    }
);
