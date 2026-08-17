// =====================================================
// TELECOD - SUPABASE DATABASE
// =====================================================

const SUPABASE_URL =
    "https://qrhbgffmqorzbcfvnbkk.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaGJnZmZtcW9yemJjZnZuYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTEzOTIsImV4cCI6MjEwMjUyNzM5Mn0.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// =====================================================
// AUTH
// =====================================================

async function getCurrentUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Get user error:", error);
        return null;
    }

    return user;
}


async function signUp(email, password) {

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        throw error;
    }

    return data;
}


async function signIn(email, password) {

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }

    return data;
}


async function signOut() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        throw error;
    }
}
