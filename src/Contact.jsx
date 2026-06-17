export default function Contact() {
  return (
    <div>

      <button onClick={() => {
        localStorage.setItem("cardforge-screen", "home");
        window.location.reload();
      }}>
        ← Back to CardForge
      </button>

      <h1>Contact</h1>

      <p>
        Feedback, bug reports and ideas are always welcome.
      </p>

      <p>
        Email:
      </p>

      <p>
        tonemail@email.com
      </p>

    </div>
  );
}