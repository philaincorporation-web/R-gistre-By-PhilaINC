// main.js COMPLET - VALIDITÉ 1 MINUTE + GÉNÉRATEUR QR TEST ✅
import "./style.css";
import 'animate.css';

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";
const APP_BASE_URL = "https://r-gistre-by-phila-inc.vercel.app";

// 🔧 CONFIGURATION : 1 MINUTE DE VALIDITÉ
let LINK_VALIDITY_CONFIG = {
  unit: 'minute',  
  value: 1         // 1 minute exactement
};

// 📅 Calcul date d'expiration
function calculateExpirationDate() {
  const now = new Date();
  const config = LINK_VALIDITY_CONFIG;
  
  switch(config.unit) {
    case 'second': now.setSeconds(now.getSeconds() + config.value); break;
    case 'minute': now.setMinutes(now.getMinutes() + config.value); break;
    case 'hour':   now.setHours(now.getHours() + config.value); break;
    case 'day':    now.setDate(now.getDate() + config.value); break;
    default: now.setMinutes(now.getMinutes() + 1);
  }
  return now.toISOString();
}

// ✅ Vérifie si lien encore valide
function isLinkStillValid(expirationDateStr) {
  const expiration = new Date(expirationDateStr);
  return new Date() < expiration;
}

// Utilitaires API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch (e) {}
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `Erreur réseau (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function apiGetById(userId) {
  const results = await apiRequest(`${API_URL}/search?ID=${encodeURIComponent(userId)}`);
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("404: ID not found");
  }
  return results[0];
}

async function apiSearchByName(nom, prenom) {
  return apiRequest(`${API_URL}/search?Nom=${encodeURIComponent(nom)}&Prénom=${encodeURIComponent(prenom)}`);
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
  return days[new Date().getDay()];
}

function generateUserId() {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `U-${now}-${rand}`.toUpperCase();
}

// ✅ VÉRIFICATION 1 MINUTE + ANTI-TRICHERIE
async function checkPresenceWithQR(userId) {
  const todayColumn = getTodayColumnName();
  
  try {
    const userData = await apiGetById(userId);
    const nomComplet = `${userData.Nom || ''} ${userData.Prénom || ''}`.trim() || "Utilisateur";

    // 🚫 LIEN DÉJÀ UTILISÉ
    if (userData.LienInvalide === "OUI") {
      showStatus(`❌ 🚫 Ce QR a été <strong>DÉJÀ UTILISÉ</strong>.`, "error");
      return;
    }

    // 🚫 LIEN EXPIRÉ (1 MINUTE)
    if (userData.DateExpiration && !isLinkStillValid(userData.DateExpiration)) {
      showStatus(
        `❌ ⏰ QR <strong>EXPIRE</strong> après 1 min. Générez-en un nouveau.`,
        "error"
      );
      return;
    }

    // 🚫 DÉJÀ PRÉSENT
    if (userData[todayColumn] === "Présent") {
      showStatus(`✅ ${nomComplet} ! Déjà enregistré aujourd'hui.`, "success");
      return;
    }

    // ✅ VALIDATION : Marquer + Invalider + 1 min expiration
    const expirationDate = calculateExpirationDate();
    await apiPatchById(userId, { 
      [todayColumn]: "Présent",
      LienInvalide: "OUI",
      DateExpiration: expirationDate
    });

    showStatus(
      `🎉 ${nomComplet} ! Présence <strong>VALIDÉE</strong> en ${todayColumn.toLowerCase()} !
       <br><small>🔒 QR invalide après <strong>1 MIN</strong>.</small>`,
      "success"
    );

  } catch (error) {
    showStatus(`❌ Erreur: ${error.message}`, "error");
  }
}

function showStatus(message, type) {
  const messageBox = document.querySelector("#form-message");
  if (messageBox) {
    messageBox.innerHTML = message;
    messageBox.className = `form-message form-message--${type}`;
  }
}

// 🔥 GÉNÉRATEUR QR TEST 1 MINUTE (F12 → Console)
window.generateTestQR = async function(nom = "TEST", prenom = "USER") {
  try {
    const userId = generateUserId();
    const todayColumn = getTodayColumnName();
    
    const testUser = {
      ID: userId,
      Nom: nom,
      Prénom: prenom,
      Organisation: "TEST-EVENT",
      Telephone: "0000000000",
      Formation: "Bureautique appliquée",
      Dimanche: "", Lundi: "", Mardi: "", Mercredi: "",
      Jeudi: "", Vendredi: "", Samedi: "",
      LienInvalide: "",
      DateExpiration: "",
      "Date de création": new Date().toISOString()
    };
    
    await apiCreateUser(testUser);
    
    const qrLink = `${APP_BASE_URL}?userId=${userId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrLink)}&color=000000&bgcolor=FFFFFF&qzone=1`;
    
    console.log(`✅ UTILISATEUR CRÉÉ: ${nom} ${prenom}`);
    console.log(`🆔 ID: ${userId}`);
    console.log(`🔗 LIEN: ${qrLink}`);
    console.log(`🖼️ QR: ${qrUrl}`);
    console.log(`⏱️ VALIDITÉ: 1 MINUTE`);
    
    window.open(qrUrl, '_blank');
    alert(`✅ QR TEST 1 MIN généré ! Ouvre la console (F12) pour tous les détails.`);
    
  } catch (error) {
    console.error('Erreur génération QR:', error);
    alert('❌ Erreur création utilisateur: ' + error.message);
  }
};

// HTML
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
  htmlContent += `<div id="loading">🔍 Vérification QR (valide 1 min)...</div>`;
} else {
  htmlContent += `
    <div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 12px; margin: 20px 0;">
      <h3 style="color: #2c5aa0; margin-bottom: 10px;">🧪 MODE TEST (Console F12)</h3>
      <p><strong>generateTestQR("Marie", "DUPONT")</strong> → Génère QR 1 min</p>
      <p><em>Validité: 1 scan + 1 minute seulement !</em></p>
    </div>
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
  if (qrUserId) {
    await checkPresenceWithQR(qrUserId);
    return;
  }

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
        showStatus("❌ Tous les champs requis sont obligatoires.", "error");
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
            LienInvalide: "",
            DateExpiration: "",
            "Date de création": new Date().toISOString()
          };
          await apiCreateUser(newUserPayload);
        }

        await apiPatchById(userId, { [todayColumn]: "Présent" });

        if (isNewUser) {
          showStatus(
            `🎉 ${nom} ${prenom} ! Inscription réussie !<br>
             <small>📱 Demandez votre QR 1 min à l'organisateur.</small>`,
            "success"
          );
        } else {
          showStatus("✅ Présence enregistrée !", "success");
        }
        form.reset();
      } catch (error) {
        showStatus("❌ Erreur: " + error.message, "error");
      }
    });
  }
}

init();
