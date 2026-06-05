import { supabase } from "./supabaseClient";

export default function AuthComponent() {
  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  }

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>CardForge</h1>

      <button onClick={signInGoogle}>
        Se connecter avec Google
      </button>
    </div>
  );
}