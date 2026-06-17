export default function Privacy() {
  return (
    <div>

      <button onClick={() => {
        localStorage.setItem("cardforge-screen", "home");
        window.location.reload();
      }}>
        ← Back to CardForge
      </button>

      <h1>Privacy Policy</h1>

      <p>
        CardForge respects your privacy.
      </p>

      <p>
        We only collect the information necessary to provide the service, such as authentication and your flashcard data.
      </p>

      <p>
        Your information is never sold to third parties.
      </p>

      <p>
        If you have any questions, contact:
      </p>

      <p>
        aferslidou@gmail.com
      </p>

    </div>
  );
}