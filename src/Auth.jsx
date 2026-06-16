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

      <p className="auth-subtitle">
        Turn websites, PDFs, and notes into flashcards.
      </p>

      <div className="auth-features">
        <div>🌐 Websites</div>
        <div>📄 PDFs</div>
        <div>✨ AI flashcards</div>
      </div>

      <button onClick={signInGoogle}>
        Continue with Google
      </button>
    </div>
  );
}