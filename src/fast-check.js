import "./style.css";

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";

// Jour de la semaine -> nom de colonne
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

  if (["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"].includes(dayName)) {
    return dayName;
  }
  return null;
}

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-bg">
    <div class="app-overlay">
      <h1 class="form-title">Check-in rapide</h1>
      <p class="form-subtitle">
        Scannez ce QR Code pour marquer votre présence du jour. Si c'est votre première fois, utilisez d'abord le QR Code d'inscription.
      </p>

      <form id="fast-check-form" autocomplete="off">
        <div class="form-group">
          <label class="form-label" for="nom">Nom</label>
          <input class="form-input" id="nom" name="nom" type="text" placeholder="Entrez votre nom" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="prenom">Prénom</label>
          <input class="form-input" id="prenom" name="prenom" type="text" placeholder="Entrez votre prénom" required />
        </div>

        <button type="submit" class="form-button">Marquer ma présence</button>

        <div id="form-message" class="form-message"></div>
      </form>
    </div>
  </div>
`;

const form = document.querySelector("#fast-check-form");
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

  if (!nom || !prenom) {
    messageBox.textContent = "Merci de renseigner Nom et Prénom.";
    messageBox.classList.add("form-message--error");
    return;
  }

  try {
    // 1) Chercher l'utilisateur dans le Sheet
    const searchUrl = `${API_URL}/search?Nom=${encodeURIComponent(
      nom
    )}&Prénom=${encodeURIComponent(prenom)}`;

    const searchRes = await fetch(searchUrl);
    const existingUsers = await searchRes.json();

    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      messageBox.textContent =
        "Vous n'êtes pas encore enregistré. Merci d'utiliser d'abord le QR Code d'inscription.";
      messageBox.classList.add("form-message--error");
      return;
    }

    const user = existingUsers[0];
    const userId = user.ID;
    const currentValue = user[todayColumn]; // valeur actuelle pour ce jour
    const dayLabel = todayColumn.toLowerCase();

    // 2) Si déjà présent pour ce jour -> message spécial, pas d'update
    if (currentValue && currentValue.toString().trim() !== "") {
      messageBox.textContent =
        `Votre présence du ${dayLabel} a déjà été enregistrée. Merci.`;
      messageBox.classList.add("form-message--success");
      form.reset();
      return;
    }

    // 3) Sinon, marquer "Présent" pour ce jour
    const updateBody = {
      data: {
        [todayColumn]: "Présent",
      },
    };

    const updateRes = await fetch(`${API_URL}/ID/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateBody),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Erreur update (${updateRes.status}) : ${errText}`);
    }

    messageBox.textContent =
      `Votre présence du ${dayLabel} vient d'être enregistrée. Merci.`;
    messageBox.classList.add("form-message--success");

    form.reset();
  } catch (error) {
    console.error("Erreur détaillée (fast-check) :", error);
    messageBox.textContent =
      "Une erreur est survenue lors de l'enregistrement. " +
      (error.message || "Erreur inconnue");
    messageBox.classList.add("form-message--error");
  }
});
