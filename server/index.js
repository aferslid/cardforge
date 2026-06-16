console.log("INDEX STARTED");

require("dotenv").config();

console.log("Gemini key loaded:", process.env.GEMINI_API_KEY ? "YES" : "NO");

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const pdfParse = require("pdf-parse");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3001;

const upload = multer({
  storage: multer.memoryStorage(),
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CardForge API is alive");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/extract", async (req, res) => {
  let browser;

  try {
    const { url } = req.body;
    const importType = detectImportType(url);

    if (!url) {
      return res.status(400).json({ error: "URL manquante" });
    }

    browser = await chromium.launch({
    headless: true,
    args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
    ],
    });

    const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "Europe/Paris",
    extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
    },
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
    });
    });

    try {
    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
    });
    } catch (error) {
    console.log("GOTO WARNING:", error.message);
    }

    await page.waitForTimeout(8000);

    const title = await page.title();

    const bodyText = await page.locator("body").innerText().catch(() => "");

    const isBlocked =
    bodyText.includes("Performing security verification") ||
    bodyText.includes("This website uses a security service") ||
    bodyText.includes("Ray ID") ||
    bodyText.includes("Verify you are human") ||
    title.toLowerCase().includes("just a moment");

    if (isBlocked) {
    await browser.close();

    return res.status(403).json({
        error:
        "Plonkit bloque l'import automatique pour l'instant. Essaie plus tard ou utilise l'extension CardForge.",
        blockedBySecurity: true,
    });
    }

    const paragraphs = await page.$$eval("p, h1, h2, h3, li, div", (els) =>
      els
        .map((el) => el.innerText?.replace(/\s+/g, " ").trim())
        .filter((text) => text && text.length > 40)
        .slice(0, 200)
    );

    // On scroll toute la page pour déclencher le lazy loading
    await page.evaluate(async () => {
    await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 600;
        const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
        }
        }, 200);
    });
    });

    await page.waitForTimeout(2000);

    // Images classiques + backgrounds CSS
    const images = await page.evaluate(() => {
    const found = new Set();
    const results = [];

    function addImage(src, alt = "", width = 0, height = 0) {
        if (!src || found.has(src)) return;
        if (!src.startsWith("http")) return;

        found.add(src);
        results.push({ src, alt, width, height });
    }

    document.querySelectorAll("img").forEach((img) => {
        addImage(
        img.currentSrc || img.src,
        img.alt || "",
        img.naturalWidth,
        img.naturalHeight
        );
    });

    document.querySelectorAll("*").forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundImage;

        if (bg && bg !== "none") {
        const match = bg.match(/url\(["']?(.*?)["']?\)/);
        if (match && match[1]) {
            addImage(match[1], "", el.clientWidth, el.clientHeight);
        }
        }
    });

    return results
        .filter((img) => img.width > 80 && img.height > 80)
        .slice(0, 300);
    });

    
    let cardCandidates = [];

    if (importType === "plonkit") {
      cardCandidates = await extractPlonkitCards(page);
    } else if (importType === "wikipedia") {
      cardCandidates = await extractWikipediaGalleryCards(page);
    } else if (importType === "us50-license-plates") {
      cardCandidates = await extractUS50LicensePlates(page);
    } else {
      cardCandidates = await extractGalleryCards(page);
    }

    await browser.close();

    res.json({
        title,
        importType,
        paragraphs,
        images,
        cardCandidates,
    });
  } catch (error) {
    if (browser) await browser.close();

    console.error("EXTRACTION ERROR:", error.message);
    console.error(error.stack);
    res.status(500).json({
      error: "Impossible d’extraire cette page",
    });
  }
});

async function extractPlonkitCards(page) {
  return await page.evaluate(() => {
    const cards = [];

    document.querySelectorAll("img").forEach((img) => {
      const src = img.currentSrc || img.src;
      if (!src || !src.startsWith("http")) return;
      if (img.naturalWidth < 100 || img.naturalHeight < 100) return;

      let container = img.parentElement;

      for (let i = 0; i < 4; i++) {
        if (!container) break;

        const text = container.innerText?.replace(/\s+/g, " ").trim();

        if (text && text.length > 40) {
          cards.push({
            image: src,
            title: "",
            content: text.slice(0, 500),
            cardType: "info",
          });
          return;
        }

        container = container.parentElement;
      }
    });

    return cards.slice(0, 120);
  });
}

async function extractGalleryCards(page) {
  return await page.evaluate(() => {
    const cards = [];
    const seen = new Set();

    function absoluteUrl(src) {
      if (!src) return "";
      if (src.startsWith("http")) return src;
      if (src.startsWith("//")) return "https:" + src;
      if (src.startsWith("/")) return window.location.origin + src;
      return new URL(src, window.location.href).href;
    }

    function bestImageSrc(img) {
      if (img.currentSrc) return absoluteUrl(img.currentSrc);
      if (img.src) return absoluteUrl(img.src);

      const srcset = img.getAttribute("srcset");
      if (srcset) {
        const parts = srcset.split(",").map((p) => p.trim());
        const last = parts[parts.length - 1];
        return absoluteUrl(last.split(" ")[0]);
      }

      return "";
    }

    function cleanText(text) {
      return (text || "")
        .replace(/\s+/g, " ")
        .replace("Drapeau de l’", "")
        .replace("Drapeau de l'", "")
        .replace("Drapeau de la ", "")
        .replace("Drapeau du ", "")
        .replace("Drapeau des ", "")
        .replace("Drapeau de ", "")
        .trim();
    }

    function findBestText(container, img) {
      const selectors = [
        "figcaption",
        "span",
        "strong",
        "b",
        "a",
        "p",
        "div",
      ];

      for (const selector of selectors) {
        const elements = Array.from(container.querySelectorAll(selector));

        for (const el of elements) {
          if (el.contains(img)) continue;

          const text = cleanText(el.innerText);

          if (text.length >= 2 && text.length <= 80) {
            return text;
          }
        }
      }

      const raw = cleanText(container.innerText);
      if (raw.length >= 2 && raw.length <= 80) return raw;

      return "";
    }

    document.querySelectorAll("img").forEach((img) => {
      const src = bestImageSrc(img);
      if (!src) return;

      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;

      if (width < 30 || height < 20) return;

      let container =
        img.closest("li, figure, td, .flex, .item, .card, a, div") ||
        img.parentElement;

      if (!container) return;

      let text = findBestText(container, img);

      // Si le container immédiat ne donne rien, on remonte un peu.
      let parent = container.parentElement;
      let attempts = 0;

      while (!text && parent && attempts < 4) {
        text = findBestText(parent, img);
        parent = parent.parentElement;
        attempts++;
      }

      if (!text) return;
      if (seen.has(src)) return;

      seen.add(src);

      cards.push({
        image: src,
        title: "",
        content: text,
        cardType: "quiz",
      });
    });

    return cards.slice(0, 500);
  });
}

async function extractWikipediaGalleryCards(page) {
  return await page.evaluate(() => {
    const cards = [];
    const seen = new Set();

    document.querySelectorAll("td img").forEach((img) => {
      const src = img.currentSrc || img.src;
      if (!src || !src.startsWith("http")) return;
      if (img.naturalWidth < 30 || img.naturalHeight < 20) return;

      const cell = img.closest("td");
      if (!cell) return;

      let text = cell.innerText?.replace(/\s+/g, " ").trim() || "";

      text = text
        .replace(/^Drapeau de l’/i, "")
        .replace(/^Drapeau de l'/i, "")
        .replace(/^Drapeau du /i, "")
        .replace(/^Drapeau de la /i, "")
        .replace(/^Drapeau des /i, "")
        .replace(/^Drapeau de /i, "")
        .replace(/^Flag of the /i, "")
        .replace(/^Flag of /i, "")
        .trim();

      if (!text || text.length < 2 || text.length > 80) return;
      if (seen.has(src)) return;

      seen.add(src);

      cards.push({
        image: src,
        title: "",
        content: text,
        cardType: "quiz",
      });
    });

    return cards.slice(0, 300);
  });
}

async function extractUS50LicensePlates(page) {
  return await page.evaluate(() => {
    const cards = [];

    document.querySelectorAll(".sealsRow .col-xs-6, .sealsRow .col-md-3").forEach((box) => {
      const state = box.querySelector("span.center.bold")?.innerText?.trim();
      const img = box.querySelector("img");
      const link = box.querySelector("a")?.href;

      if (!state || !img) return;

      let image = img.currentSrc || img.src;

      if (image.startsWith("/")) {
        image = window.location.origin + image;
      }

      image = image.replace("-thumb", "");

      cards.push({
        image,
        title: "",
        content: state,
        cardType: "quiz",
        sourceUrl: link || "",
      });
    });

    return cards.slice(0, 60);
  });
}

function detectImportType(url) {
  if (url.includes("plonkit.net")) {
    return "plonkit";
  }

  if (url.includes("wikipedia.org")) {
    return "wikipedia";
  }

  if (url.includes("theus50.com")) {
    return "us50-license-plates";
  }

  return "gallery";
}

app.post("/generate-cards", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Prompt manquant",
      });
    }

    const fullPrompt = `
Tu es un générateur de cartes d'apprentissage.

Crée des flashcards à partir de cette demande :
"${prompt}"

Retourne uniquement du JSON valide.
Aucun texte avant ou après.

Format exact :
[
  {
    "question": "texte de la question",
    "answer": "texte de la réponse"
  }
]

Règles :
- Fais des cartes courtes.
- Une seule idée par carte.
- Maximum 100 cartes.
- Si c'est du vocabulaire, question = mot à apprendre, answer = traduction.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    let text = response.text.trim();

    text = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    const cards = JSON.parse(text);

    res.json({
      success: true,
      cards,
    });
  } catch (error) {
    console.error("AI GENERATION ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/pdf-extract", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "PDF manquant",
      });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    const cardType = req.body.cardType || "quiz";

    const lines = text
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 2);

    const cards = [];

    lines.forEach((line, index) => {
      const separators = [" - ", " – ", " : ", " = "];

      for (const sep of separators) {
        if (line.includes(sep)) {
          const [left, ...rightParts] = line.split(sep);
          const right = rightParts.join(sep);

          if (
            left.trim().length > 0 &&
            right.trim().length > 0 &&
            left.trim().length < 80 &&
            right.trim().length < 120
          ) {
            let question = left.trim();
            let answer = right.trim();

            question = question
            .replace(/^•\s*/, "")
            .replace(/\(\d+\)$/g, "")
            .trim();

            answer = answer
            .replace(/^•\s*/, "")
            .trim();

            cards.push({
            id: Date.now() + index,
            type: cardType,
            question: cardType === "quiz" ? question : "",
            answer: cardType === "quiz" ? answer : "",
            title: cardType === "info" ? question : "",
            content: cardType === "info" ? answer : "",
            });
          }

          break;
        }
      }
    });

    res.json({
      success: true,
      text,
      cards,
    });
  } catch (error) {
    console.error("PDF EXTRACT ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

console.log("ROUTES VERSION: health-check-a3afe11");
console.log("ABOUT TO LISTEN");

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});