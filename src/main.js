// main.js COMPLET - LIEN UNIQUE 1 SCAN/JOUR + ANTI-TRICHERIE ✅
import "./style.css";
import 'animate.css';

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";
const APP_BASE_URL = "https://r-gistre-by-phila-inc.vercel.app";

// 🚨 DATE D'AUJOURD'HUI POUR VALIDATION
const TODAY_DATE = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Utilitaires API (inchangés)
async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch (e) {}
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `Erreur réseau (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function apiGetById(userId) {
  const results = await apiRequest(`${API_URL}/search?ID=${encodeURIComponent(userId)}`);
  if (!Array.isArray(results) || results.length === 0) {
    const notFoundError = new Error("404: ID not found");
    throw notFoundError;
  }
  return results[0];
}

async function apiSearchByName(nom, prenom) {
  const searchUrl = `${API_URL}/search?Nom=${encodeURIComponent(nom)}&Prénom=${encodeURIComponent(prenom)}`;
  return apiRequest(searchUrl);
}

async function apiPatchById(userId, data) {
  return apiRequest(`${API_URL}/ID/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

async function apiCreateUser(payload) {
  return apiRequest(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [payload] }),
  });
}

function getTodayColumnName() {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const today = new Date();
  return days[today.getDay()];
}

function generateUserId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `U-${now}-${rand}`.toUpperCase();
}

// ✅ VÉRIFICATION LIEN UNIQUE + ANTI-TRICHERIE
async function checkPresenceWithQR(userId) {
  const todayColumn = getTodayColumnName();
  
  try {
    const userData = await apiGetById(userId);
    const nomComplet = `${userData.Nom || ''} ${userData.Prénom || ''}`.trim() || "Utilisateur";

    // 🚫 LIEN DÉJÀ UTILISÉ (1 scan = invalide)
    if (userData.LienInvalide === "OUI") {
      showStatus(
        `❌ 🚫 Ce lien QR a été <strong>DÉJÀ UTILISÉ</strong> aujourd'hui. Contactez l'organisateur pour un nouveau QR.`,
        "error"
      );
      return;
    }

    // 🚫 DÉJÀ PRÉSENT AUJOURD'HUI
    if (userData[todayColumn] === "Présent") {
      showStatus(
        `✅ ${nomComplet} ! Vous êtes <strong>DÉJÀ enregistré</strong> pour ${todayColumn.toLowerCase()}.`,
        "success"
      );
      return;
    }

    // ✅ 1ER SCAN : Marquer présent ET invalider le lien
    await apiPatchById(userId, { 
      [todayColumn]: "Présent",
      LienInvalide: "OUI"  // ← LIEN RENDU INVALIDE
    });

    showStatus(
      `🎉 ${nomComplet} ! Présence <strong>${todayColumn.toLowerCase()}</strong> validée ! 
       <br><small>🔒 Ce lien est maintenant <strong>invalide</strong>.</small>`,
      "success"
    );

  } catch (error) {
    console.error("Erreur checkPresenceWithQR:", error);
    const errorDetails = error.message || String(error) || "Erreur inconnue";
    if (errorDetails.includes("404") || errorDetails.includes("not found")) {
      showStatus(`❌ Utilisateur introuvable. Veuillez vous réinscrire.`, "error");
    } else {
      showStatus(`❌ Erreur: ${errorDetails}`, "error");
    }
  }
}

function showStatus(message, type) {
  const messageBox = document.querySelector("#form-message");
  if (messageBox) {
    messageBox.innerHTML = message;
    messageBox.className = `form-message form-message--${type}`;
  }
}

// Initialisation HTML
const app = document.querySelector("#app");
const urlParams = new URLSearchParams(window.location.search);
const qrUserId = urlParams.get('userId');

let htmlContent = `
  <div class="app-bg">
    <div class="app-overlay">
      <h1 class="animate__animated animate__bounce">Régistre de présence</h1>
      <br>
      <h2 class="animate__animated animate__bounce">Formation DGIeWOMEN SCHOOL/ASSINCO.SA</h2>`;

if (qrUserId) {
  htmlContent += `<div id="loading">🔍 Vérification de votre présence...</div>`;
} else {
  htmlContent += `
      <br>
      <form id="presence-form" autocomplete="off">
        <div class="form-group">
          <label class="form-label" for="nom">Nom</label>
          <input class="form-input" id="nom" name="nom" type="text" placeholder="Veuillez saisir correctement votre Nom" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="prenom">Prénom</label>
          <input class="form-input" id="prenom" name="prenom" type="text" placeholder="Veuillez saisir correctement votre prénom" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="organisation">Organisation / Service</label>
          <input class="form-input" id="organisation" name="organisation" type="text" placeholder="Veuillez renseigner votre poste ou département" />
        </div>
        <div class="form-group">
          <label class="form-label" for="telephone">Numéro de téléphone</label>
          <input class="form-input" id="telephone" name="telephone" type="tel" placeholder="Entrez votre numéro de téléphone" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="formation">Formation</label>
          <select class="form-input" id="formation" name="formation" required>
            <option value="">Choisissez votre formation</option>
            <option value="Bureautique appliquée">Bureautique appliquée</option>
            <option value="Cybersécurité">Cybersécurité</option>
            <option value="Intelligence artificielle">Intelligence artificielle</option>
          </select>
        </div>
        <button type="submit" id="submit-full" class="form-button" style="margin-top: 10px;">Enregistrer ma présence</button>
      </form>`;
}

htmlContent += `
      <div id="form-message" class="form-message"></div>
      <div class="social-bar">
        <a href="https://www.digiewomenawards.com/" target="_blank" class="social-link">
          <img src="/digie.jpeg" alt="Digie" class="social-icon" />
        </a>
        <a href="https://www.linkedin.com/company/digiewomen-school/" target="_blank" class="social-link">
          <img src="/linkdin.jpg" alt="LinkedIn" class="social-icon" />
        </a>
        <a href="https://www.facebook.com/digiewomenschool" target="_blank" class="social-link">
          <img src="/facebook.jpg" alt="Facebook" class="social-icon" />
        </a>
        <a href="https://whatsapp.com/channel/0029VaufFo67T8bY1a1drU15" target="_blank" class="social-link">
          <img src="/whatsapp.jpg" alt="WhatsApp" class="social-icon" />
        </a>
        <a href="https://www.instagram.com/digiewomenschool?igsh=MXNnZTQ2dDg2OHE0OA==" target="_blank" class="social-link">
          <img src="/Insta.jpg" alt="Instagram" class="social-icon" />
        </a>
      </div>
      <br>
      <p class="form-subtitle">Copyright © 2026 DigieWOMEN SCHOOL Tous droits réservés.</p>
    </div>
  </div>`;

app.innerHTML = htmlContent;

async function init() {
  // 🚨 MODE QR : Vérification + invalidation
  if (qrUserId) {
    await checkPresenceWithQR(qrUserId);
    return;
  }

  // Formulaire complet (création + présence)
  const form = document.querySelector("#presence-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const todayColumn = getTodayColumnName();
      const nom = document.querySelector("#nom").value.trim();
      const prenom = document.querySelector("#prenom").value.trim();
      const organisation = document.querySelector("#organisation").value.trim();
      const telephone = document.querySelector("#telephone").value.trim();
      const formation = document.querySelector("#formation").value;

      if (!nom || !prenom || !telephone || !formation) {
        showStatus("❌ Nom, prénom, téléphone et formation sont requis.", "error");
        return;
      }

      try {
        const existingUsers = await apiSearchByName(nom, prenom);
        let userId, isNewUser = false;

        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          userId = existingUsers[0].ID;
        } else {
          userId = generateUserId();
          isNewUser = true;
          
          const newUserPayload = {
            ID: userId,
            Nom: nom,
            Prénom: prenom,
            Organisation: organisation,
            Telephone: telephone,
            Formation: formation,
            Dimanche: "", Lundi: "", Mardi: "", Mercredi: "",
            Jeudi: "", Vendredi: "", Samedi: "",
            LienInvalide: "",  // ← Colonne pour invalidation
            "Date de création": new Date().toISOString()
          };

          await apiCreateUser(newUserPayload);
        }

        // Marquer présent
        await apiPatchById(userId, { [todayColumn]: "Présent" });

        if (isNewUser) {
          showStatus(
            `🎉 ${nom} ${prenom} ! Premier enregistrement réussi !<br>
             <small>📱 Générez votre QR personnel via l'organisateur.</small>`,
            "success"
          );
        } else {
          showStatus("✅ Présence enregistrée avec succès !", "success");
        }

        form.reset();
      } catch (error) {
        showStatus("❌ Erreur: " + error.message, "error");
      }
    });
  }
}

init();
