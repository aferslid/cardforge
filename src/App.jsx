import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import AuthComponent from "./Auth";

const initialProjects = [];

function App() {
  const [projects, setProjects] = useState([]);
  const [screen, setScreen] = useState(
    localStorage.getItem("cardforge-screen") || "home"
  );

  const [selectedProjectId, setSelectedProjectId] = useState(
    localStorage.getItem("cardforge-selected-project") || null
  );

  const [selectedQuizId, setSelectedQuizId] = useState(
    localStorage.getItem("cardforge-selected-quiz") || null
  );

  const [quizViewMode, setQuizViewMode] = useState(
    localStorage.getItem("cardforge-quiz-view-mode") || "overview"
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [newQuizName, setNewQuizName] = useState("");
  const [sourceMode, setSourceMode] = useState("ai");
  const [sourceText, setSourceText] = useState("");
  const [url, setUrl] = useState("");
  const [manualCards, setManualCards] = useState([]);
  const [cardQuestion, setCardQuestion] = useState("");
  const [cardAnswer, setCardAnswer] = useState("");
  const [cardType, setCardType] = useState("quiz");
  const [cardTitle, setCardTitle] = useState("");
  const [cardContent, setCardContent] = useState("");
  const [cardImage, setCardImage] = useState("");
  const [extractedPage, setExtractedPage] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const aiExamples = [
    "Les 33 lettres de l'alphabet russe avec prononciation",
    "50 verbes espagnols courants avec traduction française",
    "Capitales des pays d'Europe",
    "20 questions de culture générale faciles",
  ];
  const [pdfCards, setPdfCards] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfCardType, setPdfCardType] = useState("quiz");
  const [highlightText, setHighlightText] = useState("");
  const [selectedHighlight, setSelectedHighlight] = useState("");
  const [quizNameError, setQuizNameError] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [reviewCards, setReviewCards] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [creationGroup, setCreationGroup] = useState("");
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showQuizSettings, setShowQuizSettings] = useState(false);
  const [renameModal, setRenameModal] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [openDeckMenu, setOpenDeckMenu] = useState(null);
  const [openProjectMenu, setOpenProjectMenu] = useState(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedQuiz = selectedProject?.quizzes.find((q) => q.id === selectedQuizId);

  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("cardforge-screen", screen);
  }, [screen]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("cardforge-selected-project", selectedProjectId);
    } else {
      localStorage.removeItem("cardforge-selected-project");
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedQuizId) {
      localStorage.setItem("cardforge-selected-quiz", selectedQuizId);
    } else {
      localStorage.removeItem("cardforge-selected-quiz");
    }
  }, [selectedQuizId]);

  useEffect(() => {
    localStorage.setItem("cardforge-quiz-view-mode", quizViewMode);
  }, [quizViewMode]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 500);
    }

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function closeMenus() {
      setOpenProjectMenu(null);
      setOpenDeckMenu(null);
    }

    window.addEventListener("click", closeMenus);

    return () => window.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    async function loadProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          quizzes (
            *,
            cards (*)
          )
        `)
        .or(`user_id.eq.${session.user.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement projets:", error);
        return;
      }

      setProjects(
        data.map((project) => ({
          id: project.id,
          name: project.name,
          coverImage: project.cover_image || "",
          quizzes: (project.quizzes || []).map((quiz) => ({
            id: quiz.id,
            name: quiz.title,
              title: quiz.title,
            coverImage: quiz.cover_image || "",
            cards: (quiz.cards || []).map((card) => ({
              id: card.id,
              type: card.type || "info",
              title: card.title || "",
              question: card.question || "",
              answer: card.answer || "",
              content: card.content || card.answer || "",
              image: card.image || "",
            })),
          })),
        }))
      );
    }

    loadProjects();
  }, [session]);

  function goHome() {
    setShowProjectSettings(false);
    setShowQuizSettings(false);

    setScreen("home");
    setSelectedProjectId(null);
    setSelectedQuizId(null);
  }

  function openProject(projectId) {
    setSelectedProjectId(projectId);
    setSelectedQuizId(null);
    setScreen("project");
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: newProjectName.trim(),
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création projet:", error);
      return;
    }

    const newProject = {
      id: data.id,
      name: data.name,
      quizzes: [],
    };

    setProjects([newProject, ...projects]);
    setNewProjectName("");
  }

  async function createQuizPlaceholder() {
    if (!selectedProject) return;

    if (!newQuizName.trim()) {
      setQuizNameError("Donne un nom au quiz avant de le créer.");
      return;
    }

    setQuizNameError("");
    if (!session?.user) return;

    let cards = [];

    if (sourceMode === "highlight" || sourceMode === "manual" || sourceMode === "url") {
      cards = manualCards;
    }

    if (cards.length === 0) {
      alert("Ajoute au moins une carte avant de créer le quiz.");
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        project_id: selectedProject.id,
        user_id: session.user.id,
        title: newQuizName.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création quiz:", error);
      return;
    }

    const newQuiz = {
      id: data.id,
      name: data.title,
      sourceMode,
      sourceText,
      url,
      cards,
    };

    if (cards.length > 0) {
      const cardsToInsert = cards.map((card) => ({
        quiz_id: data.id,
        type: card.type || "info",
        title: card.title || "",
        question: card.question || "",
        answer: card.answer || "",
        content: card.content || card.answer || "",
        image: card.image || "",
      }));

      const { error: cardsError } = await supabase
        .from("cards")
        .insert(cardsToInsert);

      if (cardsError) {
        console.error("Erreur création cartes:", cardsError);
      }
    }

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProject.id) return project;

      return {
        ...project,
        quizzes: [newQuiz, ...project.quizzes],
      };
    });

    setProjects(updatedProjects);
    setSelectedQuizId(newQuiz.id);

    setNewQuizName("");
    setSourceText("");
    setUrl("");
    setManualCards([]);
    setCardQuestion("");
    setCardAnswer("");
    setCardTitle("");
    setCardContent("");
    setCardImage("");
    setHighlightText("");
    setSelectedHighlight("");

    setScreen("quiz");
  }

  function addManualCard() {
    let newCard;

    if (cardType === "quiz") {
      if (!cardQuestion.trim() || !cardAnswer.trim()) return;

      newCard = {
        id: Date.now(),
        type: "quiz",
        question: cardQuestion.trim(),
        answer: cardAnswer.trim(),
        image: cardImage.trim(),
      };
    } else {
      if (!cardTitle.trim() || !cardContent.trim()) return;

      newCard = {
        id: Date.now(),
        type: "info",
        title: cardTitle.trim(),
        content: cardContent.trim(),
        image: cardImage.trim(),
      };
    }

    setManualCards([...manualCards, newCard]);
    setCardQuestion("");
    setCardAnswer("");
    setCardTitle("");
    setCardContent("");
    setCardImage("");
  }

  async function extractUrl() {
    if (!url.trim()) return;

    setIsExtracting(true);
    setExtractError("");
    setExtractedPage(null);
    setShowImportDetails(false);

    try {
      const response = await fetch("https://cardforge-production-611b.up.railway.app/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      console.log("EXTRACTED DATA:", data);

      if (!response.ok) {
        throw new Error(data.error || "Erreur extraction");
      }

      setExtractedPage(data);
    } catch (error) {
      setExtractError(error.message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function createQuizFromCandidates() {
    if (!selectedProject || !extractedPage?.cardCandidates) return;

    if (!newQuizName.trim()) {
      setQuizNameError("Donne un nom au quiz avant de créer le deck.");
      return;
    }

    if (!session?.user) return;

    setQuizNameError("");

    const cards = extractedPage.cardCandidates
      .filter((card) => card.content)
      .filter((card) => card.content.length < 700)
      .map((card, index) => ({
        id: Date.now() + index,
        type: extractedPage.importType === "gallery" ? "quiz" : "info",
        title: "",
        question: "",
        answer: card.content,
        content: card.content,
        image: card.image || "",
      }));

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        project_id: selectedProject.id,
        user_id: session.user.id,
        title: newQuizName.trim(),
      })
      .select()
      .single();

    if (quizError) {
      console.error("Erreur création quiz:", quizError);
      return;
    }

    const cardsToInsert = cards.map((card) => ({
      quiz_id: quizData.id,
      type: card.type,
      title: card.title || "",
      question: card.question || "",
      answer: card.answer || "",
      content: card.content || "",
      image: card.image || "",
    }));

    let savedCards = [];

    if (cardsToInsert.length > 0) {
      const { data: insertedCards, error: cardsError } = await supabase
        .from("cards")
        .insert(cardsToInsert)
        .select();

      if (cardsError) {
        console.error("Erreur création cartes:", cardsError);
        return;
      }

      savedCards = insertedCards.map((card) => ({
        id: card.id,
        type: card.type || "info",
        title: card.title || "",
        question: card.question || "",
        answer: card.answer || "",
        content: card.content || card.answer || "",
        image: card.image || "",
      }));
    }

    const newQuiz = {
      id: quizData.id,
      name: quizData.title,
      sourceMode: "url",
      url,
      cards: savedCards,
    };

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProject.id) return project;

      return {
        ...project,
        quizzes: [newQuiz, ...project.quizzes],
      };
    });

    setProjects(updatedProjects);
    setSelectedQuizId(newQuiz.id);
    setNewQuizName("");
    setUrl("");
    setExtractedPage(null);
    setQuizViewMode("edit");
    setScreen("quiz");
  }

  async function deleteCard(cardId) {
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (error) {
      console.error("Erreur suppression carte:", error);
      return;
    }

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) return project;

      return {
        ...project,
        quizzes: project.quizzes.map((quiz) => {
          if (quiz.id !== selectedQuizId) return quiz;

          return {
            ...quiz,
            cards: quiz.cards.filter((card) => card.id !== cardId),
          };
        }),
      };
    });

    setProjects(updatedProjects);
  }

  async function clearCardText(cardId) {
    const { error } = await supabase
      .from("cards")
      .update({
        title: "",
        content: "",
        question: "",
        answer: "",
      })
      .eq("id", cardId);

    if (error) {
      console.error("Erreur vider texte carte:", error);
      return;
    }

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) return project;

      return {
        ...project,
        quizzes: project.quizzes.map((quiz) => {
          if (quiz.id !== selectedQuizId) return quiz;

          return {
            ...quiz,
            cards: quiz.cards.map((card) => {
              if (card.id !== cardId) return card;

              return {
                ...card,
                title: "",
                content: "",
                question: "",
                answer: "",
              };
            }),
          };
        }),
      };
    });

    setProjects(updatedProjects);
  }

  async function editCard(card) {
    const newQuestion = window.prompt(
      "Nouvelle question :",
      card.question || card.title || ""
    );

    if (newQuestion === null) return;

    const newAnswer = window.prompt(
      "Nouvelle réponse :",
      card.answer || card.content || ""
    );

    if (newAnswer === null) return;

    const { error } = await supabase
      .from("cards")
      .update({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        content: newAnswer.trim(),
      })
      .eq("id", card.id);

    if (error) {
      console.error("Erreur modification carte :", error);
      return;
    }

    const updatedProjects = projects.map((project) => ({
      ...project,
      quizzes: project.quizzes.map((quiz) => ({
        ...quiz,
        cards: quiz.cards.map((c) =>
          c.id === card.id
            ? {
                ...c,
                question: newQuestion.trim(),
                answer: newAnswer.trim(),
                content: newAnswer.trim(),
              }
            : c
        ),
      })),
    }));

    setProjects(updatedProjects);
  }

  async function setCardAsDeckCover(card) {
    if (!selectedQuiz || !card.image) return;

    const { error } = await supabase
      .from("quizzes")
      .update({ cover_image: card.image })
      .eq("id", selectedQuiz.id);

    if (error) {
      console.error("Erreur image du deck:", error);
      return;
    }

    setProjects(
      projects.map((project) => ({
        ...project,
        quizzes: project.quizzes.map((quiz) =>
          quiz.id === selectedQuiz.id
            ? { ...quiz, coverImage: card.image }
            : quiz
        ),
      }))
    );
    alert("Image du deck mise à jour !");
  }

  async function deleteProject(projectId) {
    if (
      !window.confirm(
        "Supprimer ce projet, tous les quiz et toutes les cartes ?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Erreur suppression projet:", error);
      return;
    }

    setProjects(projects.filter((project) => project.id !== projectId));
    goHome();
  }

  async function renameProject(projectId, currentName) {
    const newName = window.prompt("Nouveau nom du projet :", currentName);

    if (!newName || !newName.trim()) return;

    const { error } = await supabase
      .from("projects")
      .update({ name: newName.trim() })
      .eq("id", projectId);

    if (error) {
      console.error("Erreur renommage projet:", error);
      return;
    }

    setProjects(
      projects.map((project) =>
        project.id === projectId
          ? { ...project, name: newName.trim() }
          : project
      )
    );
  }

  async function deleteQuiz(quizId) {
    if (
      !window.confirm(
        "Supprimer ce quiz et toutes ses cartes ?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", quizId);

    if (error) {
      console.error("Erreur suppression quiz:", error);
      return;
    }

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) return project;

      return {
        ...project,
        quizzes: project.quizzes.filter(
          (quiz) => quiz.id !== quizId
        ),
      };
    });

    setProjects(updatedProjects);
    setScreen("project");
    setSelectedQuizId(null);
  }

  async function renameQuiz(quizId, currentName) {
    const newName = window.prompt("Nouveau nom du quiz :", currentName);

    if (!newName || !newName.trim()) return;

    const { error } = await supabase
      .from("quizzes")
      .update({ title: newName.trim() })
      .eq("id", quizId);

    if (error) {
      console.error("Erreur renommage quiz:", error);
      return;
    }

    setProjects(
      projects.map((project) => ({
        ...project,
        quizzes: project.quizzes.map((quiz) =>
          quiz.id === quizId
            ? { ...quiz, name: newName.trim(), title: newName.trim() }
            : quiz
        ),
      }))
    );
  }

  async function saveRename() {
  if (!renameModal || !renameValue.trim()) return;

  if (renameModal.type === "project") {
    const { error } = await supabase
      .from("projects")
      .update({ name: renameValue.trim() })
      .eq("id", renameModal.id);

    if (error) {
      console.error("Erreur renommage projet:", error);
      return;
    }

    setProjects(
      projects.map((project) =>
        project.id === renameModal.id
          ? { ...project, name: renameValue.trim() }
          : project
      )
    );
  }

  if (renameModal.type === "quiz") {
    const { error } = await supabase
      .from("quizzes")
      .update({ title: renameValue.trim() })
      .eq("id", renameModal.id);

    if (error) {
      console.error("Erreur renommage quiz:", error);
      return;
    }

    setProjects(
      projects.map((project) => ({
        ...project,
        quizzes: project.quizzes.map((quiz) =>
          quiz.id === renameModal.id
            ? {
                ...quiz,
                name: renameValue.trim(),
                title: renameValue.trim(),
              }
            : quiz
        ),
      }))
    );
  }

  setRenameModal(null);
  setRenameValue("");
}

  async function generateWithAI() {
  if (!sourceText.trim()) return;

  setIsGeneratingAI(true);

  try {
    const response = await fetch("https://cardforge-production-611b.up.railway.app/generate-cards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: sourceText,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      alert("Erreur IA");
      return;
    }

    const quizTitle = newQuizName.trim() || "AI Deck";

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        project_id: selectedProject.id,
        user_id: session.user.id,
        title: quizTitle,
      })
      .select()
      .single();

    if (quizError) {
      console.error("Erreur création quiz IA:", quizError);
      return;
    }

    const cardsToInsert = data.cards.map((card) => ({
      quiz_id: quizData.id,
      type: "quiz",
      title: "",
      question: card.question || "",
      answer: card.answer || "",
      content: "",
      image: "",
    }));

    const { data: insertedCards, error: cardsError } = await supabase
      .from("cards")
      .insert(cardsToInsert)
      .select();

    if (cardsError) {
      console.error("Erreur création cartes IA:", cardsError);
      return;
    }

    const savedCards = insertedCards.map((card) => ({
      id: card.id,
      type: card.type || "quiz",
      title: card.title || "",
      question: card.question || "",
      answer: card.answer || "",
      content: card.content || "",
      image: card.image || "",
    }));

    const newQuiz = {
      id: quizData.id,
      name: quizData.title,
      title: quizData.title,
      sourceMode: "ai",
      cards: savedCards,
    };

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProject.id) return project;

      return {
        ...project,
        quizzes: [newQuiz, ...project.quizzes],
      };
    });

    setProjects(updatedProjects);
    setSelectedQuizId(newQuiz.id);
    setSourceText("");
    setNewQuizName("");
    setQuizViewMode("overview");
    setScreen("quiz");

  } catch (error) {
    console.error(error);
  } finally {
    setIsGeneratingAI(false);
  }
}

async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  setPdfLoading(true);
  setPdfError("");
  setPdfCards([]);

  const formData = new FormData();
  formData.append("pdf", file);

  try {
    formData.append("cardType", pdfCardType);

    const response = await fetch("https://cardforge-production-611b.up.railway.app/pdf-extract", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Erreur PDF");
    }

    setPdfCards(data.cards || []);
  } catch (error) {
    setPdfError(error.message);
  } finally {
    setPdfLoading(false);
  }
}

async function confirmDelete() {
  if (!deleteModal) return;

  if (deleteModal.type === "project") {
    await deleteProject(deleteModal.id);
  }

  if (deleteModal.type === "quiz") {
    await deleteQuiz(deleteModal.id);
  }

  setDeleteModal(null);
}

function handleTextSelection() {
  const selection = window.getSelection().toString().trim();

  if (selection) {
    setSelectedHighlight(selection);
  }
}

function addHighlightCard() {
  if (!selectedHighlight.trim()) return;

  const newCard = {
    id: Date.now(),
    type: "info",
    title: "",
    content: selectedHighlight,
  };

  setManualCards((prev) => [newCard, ...prev]);
  setSelectedHighlight("");
}

if (!session) {
  return <AuthComponent />;
}

function startReview(quiz) {
  const shuffled = [...quiz.cards].sort(() => Math.random() - 0.5);
  setReviewCards(shuffled);
  setScreen("review");
}


  return (
    <div className="app">

      <button
        className="logout-btn"
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.reload();
        }}
      >
        Log out
      </button>
      
      
      {screen === "home" && (
        <main>
          <section className="home-hero">
            <h1>CardForge</h1>

            <h2>Your worlds</h2>

            <p>Pick up where you left off</p>
          </section>

          <section>
            <h2>Continue learning</h2>
            <div className="project-grid">
              {projects.map((project) => {
                const lastQuiz = project.quizzes?.[0];
                const totalCards = project.quizzes.reduce(
                  (total, quiz) => total + (quiz.cards?.length || 0),
                  0
                );

                return (
                  <button
                    key={project.id}
                    className="project-card clean"
                    style={{
                      backgroundImage: `linear-gradient(
                        rgba(0,0,0,.15),
                        rgba(0,0,0,.75)
                      ), url(${project.coverImage || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    onClick={() => openProject(project.id)}
                  >
                    <button
                      type="button"
                      className="card-menu-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenProjectMenu(openProjectMenu === project.id ? null : project.id);
                      }}
                    >
                      ⋯
                    </button>
                    {openProjectMenu === project.id && (
                      <div className="card-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameValue(project.name);
                            setRenameModal({ type: "project", id: project.id });
                            setOpenProjectMenu(null);
                          }}
                        >
                          ✏️ Renommer
                        </button>

                        <button type="button" onClick={(e) => e.stopPropagation()}>
                          🖼 Changer l'image
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ type: "project", id: project.id });
                            setOpenProjectMenu(null);
                          }}
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    )}
                    <div className="project-card-header">
                      
                      <div className="project-main-pill glass">
                        <h3>{project.name}</h3>
                        <p>
                          {project.quizzes.length} deck
                          {project.quizzes.length > 1 ? "s" : ""} · {totalCards} cartes
                        </p>
                      </div>
                    </div>

                    {lastQuiz && (
                      <div className="last-deck-card">
                        <div>
                          <strong>{lastQuiz.name} </strong>
                          <span>{lastQuiz.cards?.length || 0} cartes</span>
                        </div>

                        <span className="continue-pill">Continue →</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            className="floating-add"
            onClick={async () => {
              const name = prompt("Nom du projet ?");
              if (!name || !name.trim()) return;

              const { data, error } = await supabase
                .from("projects")
                .insert({
                  name: name.trim(),
                  user_id: session.user.id,
                })
                .select()
                .single();

              if (error) {
                console.error("Erreur création projet:", error);
                return;
              }

              setProjects([
                {
                  id: data.id,
                  name: data.name,
                  quizzes: [],
                },
                ...projects,
              ]);
            }}
          >
            +
          </button>

        </main>
      )}

      {screen === "project" && selectedProject && (
        <main>
          <button className="back" onClick={goHome}>← All projects</button>

          <section className="quiz-hero-card">
            <div>
              <span className="eyebrow">Projet</span>
              <h1>{selectedProject.name}</h1>
              <p>
                {selectedProject.quizzes.length} decks ·{" "}
                {selectedProject.quizzes.reduce(
                  (total, quiz) => total + quiz.cards.length,
                  0
                )} cards
              </p>
            </div>
          </section>

          <button className="primary create-main" onClick={() => setScreen("createQuiz")}>
            + New deck
          </button>

          <section className="section-block">
            <div className="section-header">
              <h2>My decks</h2>
            </div>

            {selectedProject.quizzes.length === 0 && (
              <p className="muted">No decks for the moment.</p>
            )}

            <div className="deck-grid">
              {selectedProject.quizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  className="deck-grid-card"
                  style={{
                    backgroundImage: `linear-gradient(
                      rgba(0,0,0,.2),
                      rgba(0,0,0,.7)
                    ), url(${quiz.coverImage || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  onClick={() => {
                    setSelectedQuizId(quiz.id);
                    setQuizViewMode("overview");
                    setScreen("quiz");
                  }}
                >
                  <button
                    type="button"
                    className="card-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDeckMenu(openDeckMenu === quiz.id ? null : quiz.id);
                    }}
                  >
                    ⋯
                  </button>

                  {openDeckMenu === quiz.id && (
                    <div className="card-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameValue(quiz.name);
                          setRenameModal({ type: "quiz", id: quiz.id });
                          setOpenDeckMenu(null);
                        }}
                      >
                        ✏️ Renommer
                      </button>

                      <button type="button" onClick={(e) => e.stopPropagation()}>
                        🖼 Changer l'image
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ type: "quiz", id: quiz.id });
                          setOpenDeckMenu(null);
                        }}
                      >
                        🗑 Supprimer
                      </button>
                    </div>
                  )}
                  <div className="deck-grid-overlay">
                    <h3>{quiz.name}</h3>

                    <span>
                      {quiz.cards.length} cards
                    </span>

                    <div className="deck-progress" />
                  </div>
                </button>
              ))}
            </div>
          </section>

        </main>
      )}

      {screen === "createQuiz" && selectedProject && (
        <main className="create-quiz-page">
          <button className="back" onClick={() => setScreen("project")}>
            ← Back to project
          </button>

          <section className="hero small">
            <h1>New deck</h1>
            <p>Project : {selectedProject.name}</p>
          </section>

          <section className="panel">
            <label>Deck name</label>
            {quizNameError && (
              <p className="error-message">{quizNameError}</p>
            )}
            <input
              placeholder="Ex : Alphabet cyrillique, Brésil, Australie..."
              value={newQuizName}
              onChange={(e) => {
                setNewQuizName(e.target.value);
                setQuizNameError("");
              }}
            />

            <label>Méthode de création</label>
            <div className="creation-groups">
              <button
                className={`creation-group-card ${creationGroup === "auto" ? "active" : ""}`}
                onClick={() => setCreationGroup("auto")}
              >
                <strong>⚡ Import automatique</strong>
                <span>URL, PDF, Plonkit, ChatGPT</span>
              </button>

              <button
                className={`creation-group-card ${creationGroup === "manual" ? "active" : ""}`}
                onClick={() => setCreationGroup("manual")}
              >
                <strong>🖍 Surlignage</strong>
                <span>Choisis exactement ce qui doit être retenu</span>
              </button>

              <button
                className={`creation-group-card ${creationGroup === "ai" ? "active" : ""}`}
                onClick={() => {
                  setCreationGroup("ai");
                  setSourceMode("ai");
                }}
              >
                <strong>🤖 IA</strong>
                <span>Décris ce que tu veux apprendre</span>
              </button>
            </div>

            {creationGroup === "auto" && (
              <div className="tabs">
                <button onClick={() => setSourceMode("url")}>URL</button>
                <button onClick={() => setSourceMode("pdf")}>PDF</button>
              </div>
            )}

            {creationGroup === "manual" && (
              <div className="tabs">
                <button onClick={() => setSourceMode("highlight-url")}>URL</button>
                <button onClick={() => setSourceMode("highlight-pdf")}>PDF</button>
                <button onClick={() => setSourceMode("highlight-text")}>Texte</button>
              </div>
            )}

            {creationGroup === "ai" && (
              <div className="tabs">
                <button onClick={() => setSourceMode("ai")}>Créer avec IA</button>
              </div>
            )}

            {creationGroup === "ai" && sourceMode === "ai" && (
                <>
                  <div className="preview-box">
                    <strong>✨ AI Generation</strong>
                    <p>
                      Describe what you want to learn. AI will automatically create a deck of flashcards for you.
                      question/réponse.
                    </p>
                  </div>

                  <label>Quick examples</label>

                  <div className="example-grid">
                    {aiExamples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className="example-chip"
                        onClick={() => setSourceText(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>

                  <label>Ce que tu veux générer</label>

                  <textarea
                    placeholder="Ex : Give me 20 beginner Russian words with French translations"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                  />

                  <button onClick={generateWithAI} disabled={isGeneratingAI}>
                    {isGeneratingAI ? "Génération en cours..." : "Générer avec IA"}
                  </button>
                </>
              )}

             {creationGroup === "auto" && sourceMode === "url" && (
              <>
                <label>Lien de la source</label>
                <input
                  placeholder="Ex : https://www.plonkit.net/brazil"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />

                {url && (
                  <a className="source-link" href={url} target="_blank" rel="noreferrer">
                    Ouvrir la source
                  </a>
                )}

                <button type="button" onClick={extractUrl}>
                  {isExtracting ? "Import en cours..." : "Importer la page"}
                </button>

                {extractError && (
                  <p className="error-message">{extractError}</p>
                )}

                {extractedPage && (
                  <div className="import-result">
                    <strong>Page importée</strong>
                    <p>{extractedPage.title}</p>
                    <p>{extractedPage.cardCandidates?.length || 0} cards ready</p>
                    <p>Import type: {extractedPage.importType}</p>
                    <button type="button" onClick={createQuizFromCandidates}>
                      Create dek with these cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImportDetails(!showImportDetails)}
                    >
                      {showImportDetails ? "Hide details" : "View details"}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="secondary-card"
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  >
                  {showManualAdd ? "Hide manual entry" : "+ Add card manually"}
                </button>

                {extractedPage && showImportDetails && (
                  <div className="extracted-preview">
                    <div className="text-preview">
                      <strong>Détails techniques</strong>
                      <p>{extractedPage.images.length} raw images found</p>
                      <p>{extractedPage.paragraphs.length} raw text found</p>
                      <p>Import type: {extractedPage.importType}</p>
                    </div>
                    <h3>Imported images</h3>

                    <div className="image-grid">
                      {extractedPage.images.slice(0, 12).map((image, index) => (
                        <img key={index} src={image.src} alt="" />
                      ))}
                    </div>

                    <h3>Candidate cards</h3>

                    {extractedPage.cardCandidates?.slice(0, 10).map((card, index) => (
                      <div key={index} className="candidate-card">
                        {card.image && (
                          <img src={card.image} alt="" />
                        )}

                        <div>
                          <strong>{card.title}</strong>
                          <p>{card.content}</p>
                        </div>
                      </div>
                    ))}

                    <h3>Imported text</h3>

                    {extractedPage.paragraphs.slice(0, 8).map((text, index) => (
                      <div key={index} className="text-preview">
                        {text}
                      </div>
                    ))}
                  </div>
                )}

                {showManualAdd && (
                  <>
                    <div className="preview-box">
                      <strong>Create from source</strong>
                      <p>
                        For now, open the source, copy what you want to learn,
                        then create the card here.
                      </p>
                    </div>

                    <label>Card type</label>

                    <div className="tabs">
                      <button
                        type="button"
                        className={cardType === "quiz" ? "active" : ""}
                        onClick={() => setCardType("quiz")}
                      >
                        Quiz
                      </button>

                      <button
                        type="button"
                        className={cardType === "info" ? "active" : ""}
                        onClick={() => setCardType("info")}
                      >
                        Info
                      </button>

                      <label>Picture URL</label>
                      <input
                        placeholder="Paste URL picture here"
                        value={cardImage}
                        onChange={(e) => setCardImage(e.target.value)}
                      />
                    </div>

                    {cardType === "quiz" && (
                      <>
                        <label>Question</label>
                        <textarea
                          placeholder="Ex : What are the most typical Mexican road lines?"
                          value={cardQuestion}
                          onChange={(e) => setCardQuestion(e.target.value)}
                        />

                        <label>Réponse</label>
                        <textarea
                          placeholder="Ex : White solid outer lines with a single unbroken yellow middle line."
                          value={cardAnswer}
                          onChange={(e) => setCardAnswer(e.target.value)}
                        />
                      </>
                    )}

                    {cardType === "info" && (
                      <>
                        <label>Titre</label>
                        <input
                          placeholder="Ex : Indonesian utility poles"
                          value={cardTitle}
                          onChange={(e) => setCardTitle(e.target.value)}
                        />

                        <label>Contenu</label>
                        <textarea
                          placeholder="Ex : Les poteaux indonésiens ont souvent..."
                          value={cardContent}
                          onChange={(e) => setCardContent(e.target.value)}
                        />
                      </>
                    )}

                    <button type="button" onClick={addManualCard}>
                      + Add card
                    </button>

                    {manualCards.length > 0 && (
                      <div className="created-cards">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setManualCards([])}
                        >
                          Empty selections
                        </button>
                        <strong>{manualCards.length} carte(s) ajoutée(s)</strong>

                        {manualCards.map((card) => (
                          <div key={card.id} className="mini-card">
                            <span>{card.type === "info" ? card.title : card.question}</span>
                            <small>{card.type === "info" ? card.content : card.answer}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {creationGroup === "manual" && sourceMode === "highlight-text" && (
              <>
                <div className="preview-box">
                  <strong>🖍 Text Highlight</strong>
                  <p>
                    Paste text, then select the important parts to create cards.
                  </p>
                </div>

                <label>Text to highlight</label>
                <textarea
                  placeholder="Paste text, notes, or a conversation excerpt here..."
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </>
            )}

            {creationGroup === "manual" && sourceMode === "highlight-url" && (
              <div className="preview-box">
                <strong>🖍 URL highlight</strong>
                <p>
                  Soon: open a website in CardForge, select the parts of interest,
                  to transform them into cards.
                </p>
              </div>
            )}

            {creationGroup === "manual" && sourceMode === "highlight-pdf" && (
              <div className="preview-box">
                <strong>🖍 PDF highlight</strong>
                <p>
                  Soon: import PDF, select the parts of interest,
                  to transform them into cards.
                </p>
              </div>
            )}

            {creationGroup === "auto" && sourceMode === "pdf" && (
              <>
                <div className="preview-box">
                  <strong>Import PDF</strong>
                  <p>
                    For now, CardForge detect simple lines like 
                    "word - translation", "word - meaning", or "question - answer".
                  </p>
                </div>

                <label>PDF file</label>
                <label>PDF card type</label>

                <div className="tabs">
                  <button
                    type="button"
                    className={pdfCardType === "quiz" ? "active" : ""}
                    onClick={() => setPdfCardType("quiz")}
                  >
                    Quiz
                  </button>

                  <button
                    type="button"
                    className={pdfCardType === "info" ? "active" : ""}
                    onClick={() => setPdfCardType("info")}
                  >
                    Info
                  </button>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                />

                {pdfLoading && <p>Lecture du PDF...</p>}

                {pdfError && (
                  <p className="error-message">{pdfError}</p>
                )}

                {pdfCards.length > 0 && (
                  <div className="import-result">
                    <strong>PDF importé</strong>
                    <p>{pdfCards.length} cartes détectées</p>

                    <button
                      type="button"
                      onClick={() => {
                        const newQuiz = {
                          id: Date.now(),
                          name: newQuizName.trim() || "PDF Deck",
                          sourceMode: "pdf",
                          cards: pdfCards,
                        };

                        const updatedProjects = projects.map((project) => {
                          if (project.id !== selectedProject.id) return project;

                          return {
                            ...project,
                            quizzes: [newQuiz, ...project.quizzes],
                          };
                        });

                        setProjects(updatedProjects);
                        setSelectedQuizId(newQuiz.id);
                        setPdfCards([]);
                        setNewQuizName("");
                        setScreen("quiz");
                      }}
                    >
                      Créer le deck avec ces cartes
                    </button>
                  </div>
                )}
              </>
            )}

            {creationGroup === "manual" && sourceMode === "highlight" && (
              <>
                <div className="preview-box">
                  <strong>Surlignage</strong>
                  <p>
                    Colle un texte, sélectionne une phrase, puis crée une carte avec ce que tu as choisi.
                  </p>
                </div>

                <label>Texte à lire</label>

                <textarea
                  placeholder="Colle ici un article, une note, un cours..."
                  value={highlightText}
                  onChange={(e) => setHighlightText(e.target.value)}
                />

                {highlightText && (
                  <div
                    className="reading-box"
                    onMouseUp={handleTextSelection}
                  >
                    {highlightText}
                  </div>
                )}

                {selectedHighlight && (
                  <div className="import-result">
                    <strong>Sélection</strong>
                    <p>{selectedHighlight}</p>

                    <button
                      type="button"
                      onClick={addHighlightCard}
                    >
                      Ajouter cette sélection
                    </button>
                  </div>
                )}

                {manualCards.length > 0 && (
                  <div className="created-cards">
                    <strong>{manualCards.length} carte(s) ajoutée(s)</strong>

                    {manualCards.map((card) => (
                      <div key={card.id} className="mini-card">
                        <span>{card.content}</span>

                        <button
                          type="button"
                          className="mini-delete"
                          onClick={() => {
                            setManualCards((prev) =>
                              prev.filter((item) => item.id !== card.id)
                            );
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {sourceMode !== "ai" && (
              <button className="primary" onClick={createQuizPlaceholder}>
                Créer le quiz
              </button>
            )}
          </section>
        </main>
      )}

      {screen === "quiz" && selectedProject && selectedQuiz && (
        <main>
          <button
            className="back"
            onClick={() => {
              setShowQuizSettings(false);
              setScreen("project");
            }}
          >
            ← Back to projects
          </button>

          <section className="quiz-hero-card">
            <span className="eyebrow">Deck</span>
            <h1>{selectedQuiz.name}</h1>
            <p>{selectedProject.name} · {selectedQuiz.cards.length} cartes</p>
          </section>

          <section>
            <div className="section-header">
              <h2>Que veux-tu faire ?</h2>
            </div>

            {quizViewMode === "overview" && (
              <div className="quiz-actions">
                <button
                  className="action-card"
                  onClick={() => startReview(selectedQuiz)}
                >
                  <strong>🔥 Réviser</strong>
                  <span>Commencer la session d'apprentissage</span>
                </button>

                <button
                  className="action-card"
                  onClick={() => setQuizViewMode("cards")}
                >
                  <strong>📖 Parcourir</strong>
                  <span>Voir toutes les cartes du deck</span>
                </button>

                <button
                  className="action-card"
                  onClick={() => setQuizViewMode("edit")}
                >
                  <strong>🛠 Edit</strong>
                  <span>Supprimer ou nettoyer les cartes</span>
                </button>
              </div>
            )}

            {quizViewMode !== "overview" && (
              <button onClick={() => setQuizViewMode("overview")}>
                ← Retour
              </button>
            )}

            {quizViewMode === "cards" && selectedQuiz.cards.map((card) => (
              <div key={card.id} className="card-row">
                {card.image && (
                  <img
                    className="card-image clickable-image"
                    src={card.image}
                    alt=""
                    onClick={() => setZoomImage(card.image)}
                  />
                )}

                {card.type === "info" ? (
                  <>
                    {card.title && <strong>{card.title}</strong>}
                    {card.content && <span>{card.content}</span>}
                  </>
                ) : (
                  <>
                    {card.question && <strong>{card.question}</strong>}
                    {card.answer && <span>{card.answer}</span>}
                  </>
                )}
              </div>
            ))}

            {quizViewMode === "edit" && selectedQuiz.cards.map((card) => (
              <div key={card.id} className="card-row">
                {card.image && (
                  <img
                    className="card-image clickable-image"
                    src={card.image}
                    alt=""
                    onClick={() => setZoomImage(card.image)}
                  />
                )}
                {card.type === "info" ? (
                  <>
                    {card.title && <strong>{card.title}</strong>}
                    {card.content && <span>{card.content}</span>}
                  </>
                ) : (
                  <>
                    {card.question && <strong>{card.question}</strong>}
                    {card.answer && <span>{card.answer}</span>}
                  </>
                )}
                {card.image && (
                  <button
                    className="secondary-card"
                    onClick={() => setCardAsDeckCover(card)}
                  >
                    ⭐ Image du deck
                  </button>
                )}
                <button
                  className="secondary-card"
                  onClick={() => editCard(card)}
                >
                  Modifier texte
                </button>
                {card.type === "info" && (
                  <button
                    className="secondary-card"
                    onClick={() => clearCardText(card.id)}
                  >
                    Vider texte
                  </button>
                )}
                <button
                  className="delete-card"
                  onClick={() => deleteCard(card.id)}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </section>
          
        </main>
      )}

      {screen === "review" && selectedQuiz && (
        <ReviewScreen
          quiz={{
            ...selectedQuiz,
            cards: reviewCards.length > 0 ? reviewCards : selectedQuiz.cards,
          }}
          onBack={() => setScreen("quiz")}
        />
      )}

      {zoomImage && (
        <div className="image-modal" onClick={() => setZoomImage(null)}>
          <button className="image-modal-close">×</button>
          <img src={zoomImage} alt="" />
        </div>
      )}

      {showScrollTop && (
        <button
          className="scroll-top-button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          ↑
        </button>
      )}

      {renameModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>
              Renommer {renameModal.type === "project" ? "le projet" : "le deck"}
            </h2>

            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />

            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => {
                  setRenameModal(null);
                  setRenameValue("");
                }}
              >
                Annuler
              </button>

              <button onClick={saveRename}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>
              Supprimer {deleteModal.type === "project" ? "ce projet" : "ce deck"} ?
            </h2>

            <p className="muted">
              Cette action est définitive.
            </p>

            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setDeleteModal(null)}
              >
                Annuler
              </button>

              <button
                className="danger"
                onClick={confirmDelete}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ReviewScreen({ quiz, onBack }) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const card = quiz.cards[index];

  function next() {
    setShowAnswer(false);
    setIndex((prev) => (prev + 1 >= quiz.cards.length ? 0 : prev + 1));
  }

  return (
    <main>
      <button className="back" onClick={onBack}>← Retour au quiz</button>

      <p className="counter">
        Carte {index + 1} / {quiz.cards.length}
      </p>

      <div className="review-progress">
        <div
          className="review-progress-fill"
          style={{
            width: `${((index + 1) / quiz.cards.length) * 100}%`,
          }}
        />
      </div>

      <div className={`flashcard ${showAnswer ? "revealed" : ""}`}>
        {card.image && (
          <img
            className="review-image clickable-image"
            src={card.image}
            alt=""
            onClick={() => setZoomImage(card.image)}
          />
        )}
        {card.type === "info" ? (
          <>
            {card.title && (
              <div className="info-title">{card.title}</div>
            )}
            <div className="info-content">{card.content}</div>
          </>
        ) : (
          <>
            <div className="question">{card.question}</div>
            {showAnswer && <div className="answer">{card.answer}</div>}
          </>
        )}
      </div>

      {card.type === "info" ? (
        <button className="review-primary" onClick={next}>
          Carte suivante
        </button>
      ) : !showAnswer ? (
        <button className="review-primary" onClick={() => setShowAnswer(true)}>
          Voir la réponse
        </button>
      ) : (
        <div className="actions">
          <button onClick={next}>❌ Je ne savais pas</button>
          <button onClick={next}>✅ Je savais</button>
        </div>
      )}
    </main>
  );
}

export default App;