const SUPABASE_URL =
    "https://qrhbgffmqorzbcfvnbkk.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaGJnZmZtcW9yemJjZnZuYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTEzOTIsImV4cCI6MjEwMjUyNzM5Mn0.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ===============================
// GET CURRENT USER
// ===============================

async function getCurrentUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        console.error(error);
        return null;
    }

    return user;
}


// ===============================
// REGISTER
// ===============================

async function registerUser(
    email,
    password,
    username,
    fullName
) {

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({

        email,
        password,

        options: {
            data: {
                username: username,
                full_name: fullName
            }
        }

    });

    if (error) {
        throw error;
    }

    return data;
}


// ===============================
// LOGIN
// ===============================

async function loginUser(email, password) {

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


// ===============================
// LOGOUT
// ===============================

async function logoutUser() {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {
        throw error;
    }

    window.location.href = "index.html";
}
