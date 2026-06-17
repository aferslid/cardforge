export default function About() {
  return (
    <div className="static-page">

        <button onClick={() => {
        localStorage.setItem("cardforge-screen", "home");
        window.location.reload();
        }}>
        ← Back to CardForge
        </button>

      <h1>About CardForge</h1>
      <p>CardForge started as a personal project to make studying GeoGuessr easier.</p>
      <p>I used resources like Plonkit and other community guides extensively, but I wanted a faster and more practical way to review information using flashcards. So I built CardForge for myself and eventually decided to make it available to everyone.</p>
      <p>GeoGuessr is where the project began, but it is not the final goal.</p>
      <p>The long-term vision behind CardForge is much broader: turning any type of knowledge into simple and effective flashcards.</p>
      <p>More importantly, the goal is to make creating flashcards effortless.</p>
      <p>In the future, CardForge aims to transform almost any source of information into decks automatically: PDFs, articles, web pages, YouTube videos, images, screenshots, AI conversations, notes, highlights, documents, books, custom text, and much more.</p>
      <p>The idea is simple: knowledge already exists everywhere. Creating flashcards should not require hours of manual work.</p>
      <p>CardForge aims to make learning faster, easier and more enjoyable by turning existing information into something you can actually remember.</p>
      <p>Today, the project focuses on GeoGuessr because that is where the idea was born and where the community helped shape it. But over time, CardForge aims to become a general learning platform for anyone who wants to learn anything.</p>
      <p>Suggestions and feedback are always welcome.</p>
      <p>📩 Contact : aferslidou@gmail.com</p>

      <hr />

      <h1>À propos de CardForge</h1>
      <p>CardForge est né comme un projet personnel pour rendre l'apprentissage de GeoGuessr plus simple et plus agréable.</p>
      <p>J'utilisais beaucoup Plonkit et d'autres ressources de la communauté, mais je voulais une manière plus rapide et plus pratique de réviser avec des flashcards. J'ai donc créé CardForge pour moi-même avant de décider de le rendre accessible à tout le monde.</p>
      <p>GeoGuessr est à l'origine du projet, mais ce n'est pas son objectif final.</p>
      <p>La vision à long terme de CardForge est bien plus large : transformer n'importe quel type de connaissance en flashcards simples et efficaces.</p>
      <p>Plus important encore, l'objectif est de rendre la création de flashcards quasiment sans effort.</p>
      <p>À terme, CardForge a pour ambition de transformer automatiquement presque n'importe quelle source d'information en decks : PDF, articles, pages web, vidéos YouTube, images, captures d'écran, conversations avec l'IA, notes, passages surlignés, documents, livres, texte personnalisé et bien plus encore.</p>
      <p>L'idée est simple : la connaissance existe déjà partout. Créer des flashcards ne devrait pas nécessiter des heures de travail manuel.</p>
      <p>CardForge a pour ambition de rendre l'apprentissage plus rapide, plus simple et plus agréable en transformant l'information existante en quelque chose que l'on peut réellement retenir.</p>
      <p>Aujourd'hui, le projet se concentre sur GeoGuessr, car c'est là qu'il est né et que la communauté a contribué à le façonner. Mais avec le temps, CardForge a vocation à devenir une plateforme d'apprentissage générale pour tous ceux qui souhaitent apprendre n'importe quoi.</p>
      <p>Les suggestions et les retours sont toujours les bienvenus.</p>
      <p>📩 Contact : aferslidou@gmail.com</p>
    </div>
  );
}