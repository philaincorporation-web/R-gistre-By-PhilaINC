import "./style.css";

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";

// Utilitaire: obtenir le jour de la semaine en français -> nom de colonne
function getTodayColumnName() {
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const today = new Date();
  const dayName = days[today.getDay()];

  // Dans ta feuille, tu utilises Lundi...Vendredi
  if (["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].includes(dayName)) {
    return dayName;
  }
  return null; // week-end, au cas où
}

// Générer un ID unique simple (tu pourras améliorer plus tard)
function generateUserId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `U-${now}-${rand}`.toUpperCase();
}

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-bg">
    <div class="app-overlay">
      <h1 class="form-title">Registre de présence</h1>
      <p class="form-subtitle">
        Scannez le QR Code, complétez vos informations et enregistrez votre présence du jour.
      </p>

      <form id="presence-form" autocomplete="off">
        <div class="form-group">
          <label class="form-label" for="nom">Nom</label>
          <input class="form-input" id="nom" name="nom" type="text" placeholder="Entrez votre nom" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="prenom">Prénom</label>
          <input class="form-input" id="prenom" name="prenom" type="text" placeholder="Entrez votre prénom" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="organisation">Organisation / Service</label>
          <input class="form-input" id="organisation" name="organisation" type="text" placeholder="Nom de votre organisation" />
        </div>

        <button type="submit" class="form-button">Enregistrer ma présence</button>

        <div id="form-message" class="form-message">
        <!-- ICI : bloc réseaux sociaux -->
       <div class="social-bar">
  <a
    href="https://www.digiewomenawards.com/"
    target="_blank"
    aria-label="Site web Digie"
    class="social-link"
  >
    <img
      src="public/digie.jpeg"
      alt="Site web"
      class="social-icon"
    />
  </a>

  <a
    href="https://www.linkedin.com/showcase/digiewomen-awards/
    target="_blank"
    aria-label="LinkedIn"
    class="social-link"
  >
    <img
      src="public/linkdin.jpg"
      alt="LinkedIn"
      class="social-icon"
    />
  </a>

  <a
    href="https://www.facebook.com/femmedigitaleafrique"
    target="_blank"
    aria-label="Facebook"
    class="social-link"
  >
    <img
      src="public/facebook.jpg"
      alt="Facebook"
      class="social-icon"
    />
  </a>

  <a
    href="https://whatsapp.com/channel/0029Vb6foT6EQIaoB06z8m1F-link"
    target="_blank"
    aria-label="WhatsApp"
    class="social-link"
  >
    <img
      src="public/whatsapp.jpg"
      alt="WhatsApp"
      class="social-icon"
    />
  </a>

  <a
    href="https://www.instagram.com/ton-compte"
    target="_blank"
    aria-label="Instagram"
    class="social-link"
  >
    <img
      src="public/Insta.jpg"
      alt="Instagram"
      class="social-icon"
    />
  </a>
</div>

        </div>
      </form>
    </div>
  </div>
`;

// Logique de soumission
const form = document.querySelector("#presence-form");
const messageBox = document.querySelector("#form-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.textContent = "";
  messageBox.className = "form-message";

  const todayColumn = getTodayColumnName();
  if (!todayColumn) {
    messageBox.textContent =
      "La présence n'est enregistrée que du lundi au vendredi.";
    messageBox.classList.add("form-message--error");
    return;
  }

  const nom = document.querySelector("#nom").value.trim();
  const prenom = document.querySelector("#prenom").value.trim();
  const organisation = document.querySelector("#organisation").value.trim();

  if (!nom || !prenom) {
    messageBox.textContent = "Merci de renseigner au moins Nom et Prénom.";
    messageBox.classList.add("form-message--error");
    return;
  }

  try {
    // 1) Vérifier si l'utilisateur existe déjà (recherche par Nom + Prénom)
    const searchUrl = `${API_URL}/search?Nom=${encodeURIComponent(
      nom
    )}&Prénom=${encodeURIComponent(prenom)}`;

    const searchRes = await fetch(searchUrl);
    const existingUsers = await searchRes.json();

    let userId;
    let isNewUser = false;

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // Utilisateur déjà existant
      userId = existingUsers[0].ID;
    } else {
      // Nouvel utilisateur -> création de la ligne
      userId = generateUserId();
      isNewUser = true;

      const createBody = {
        data: [
          {
            ID: userId,
            Nom: nom,
            Prénom: prenom,
            Organisation: organisation,
            Lundi: "",
            Mardi: "",
            Mercredi: "",
            Jeudi: "",
            Vendredi: "",
            "Date de création": new Date().toISOString(),
          },
        ],
      };

      const createRes = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      });

      const createJson = await createRes.json();
      if (!createRes.ok) {
        throw new Error("Erreur lors de la création de l'utilisateur");
      }
    }

    // 2) Mettre à jour la présence du jour (colonne Lundi..Vendredi) pour cet ID
    const updateBody = {
      data: {
        [todayColumn]: "Présent",
      },
    };

    const updateRes = await fetch(`${API_URL}/ID/${userId}`, {
      method: "PATCH", // ou PUT selon ton plan SheetDB
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Erreur update (${updateRes.status}) : ${errText}`);
    }

    // Message de confirmation personnalisé
    const dayLabel = todayColumn.toLowerCase(); // "lundi", "mardi", ...

    if (isNewUser) {
      messageBox.textContent =
        `Bienvenue, vos informations ont été enregistrées et votre présence du ${dayLabel} est prise en compte.`;
    } else {
      messageBox.textContent =
        `Votre présence du ${dayLabel} a bien été enregistrée. Merci.`;
    }
    messageBox.classList.add("form-message--success");

    // Vider tous les champs du formulaire après succès
    form.reset();
  } catch (error) {
    console.error("Erreur détaillée :", error);
    messageBox.textContent =
      "Une erreur est survenue lors de l'enregistrement. Détail : " +
      (error.message || "Erreur inconnue");
    messageBox.classList.add("form-message--error");
  }
});
