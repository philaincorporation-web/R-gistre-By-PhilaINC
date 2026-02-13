// main.js COMPLET - IP 40 MIN + BANNière + FORMULAIRE OK
import "./style.css";
import 'animate.css';
import Swal from 'sweetalert2'

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";
const APP_BASE_URL = "https://r-gistre-by-phila-inc.vercel.app";

let LINK_VALIDITY_CONFIG = { unit: 'minute', value: 1 };
const IP_VALIDITY_MINUTES = 40;
const IP_API_URL = 'https://api.ipify.org?format=json';
const ALLOWED_PUBLIC_IPS = ["102.142.25.255"];
const ALLOWED_LOCATION = { lat: 0.3925, lon: 9.4537, radiusMeters: 500 };

function calculateExpirationDate() {
  const now = new Date();
  const config = LINK_VALIDITY_CONFIG;
  switch(config.unit) {
    case 'second': now.setSeconds(now.getSeconds() + config.value); break;
    case 'minute': now.setMinutes(now.getMinutes() + config.value); break;
    case 'hour': now.setHours(now.getHours() + config.value); break;
    case 'day': now.setDate(now.getDate() + config.value); break;
    default: now.setMinutes(now.getMinutes() + 1);
  }
  return now.toISOString();
}
Swal.fire({
  title: "Enregitrez votre présence",
  icon: "success",
  draggable: true
});

function isLinkStillValid(expirationDateStr) {
  return new Date() < new Date(expirationDateStr);
}

async function checkIPValidity(userId) {
  try {
    const ipResponse = await fetch(IP_API_URL);
    const ipData = await ipResponse.json();
    const userIP = ipData.ip;

    const results = await fetch(`${API_URL}/search?ID=${userId}&IPUtilisateur=${userIP}`);
    const ipRecords = await results.json();
    
    if (Array.isArray(ipRecords) && ipRecords.length > 0) {
      const record = ipRecords[0];
      if (record.DateIPExpiration && !isLinkStillValid(record.DateIPExpiration)) {
        return { valid: false, reason: `❌ IP ${userIP.slice(0,8)}... expirée (40 min)` };
      }
    }

    const ipExpiration = new Date(Date.now() + IP_VALIDITY_MINUTES * 60000).toISOString();
    await fetch(`${API_URL}/ID/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { IPUtilisateur: userIP, DateIPExpiration: ipExpiration } })
    });

    return { valid: true, ip: userIP };
  } catch (error) {
    return { valid: true, ip: 'unknown' };
  }
}

async function getPublicIP() {
  const ipResponse = await fetch(IP_API_URL);
  const ipData = await ipResponse.json();
  return ipData.ip;
}

async function enforceAllowedNetwork() {
  const userIP = await getPublicIP();
  const isAllowed = ALLOWED_PUBLIC_IPS.includes(userIP);
  if (!isAllowed) {
    throw new Error("Connexion refusée : vous devez être sur le Wi‑Fi autorisé.");
  }
  return userIP;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(a, b) {
  const R = 6371000; // meters
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée par ce navigateur."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => reject(new Error("Localisation refusée. Activez la géolocalisation.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function enforceAllowedLocation() {
  const position = await getCurrentPosition();
  const userCoords = {
    lat: position.coords.latitude,
    lon: position.coords.longitude
  };
  const distance = calculateDistanceMeters(userCoords, {
    lat: ALLOWED_LOCATION.lat,
    lon: ALLOWED_LOCATION.lon
  });
  if (distance > ALLOWED_LOCATION.radiusMeters) {
    const km = (distance / 1000).toFixed(2);
    throw new Error(`Vous êtes trop loin du lieu (${km} km). Restez dans 500 m.`);
  }
  return distance;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch (e) {}
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `Erreur (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function apiGetById(userId) {
  const results = await apiRequest(`${API_URL}/search?ID=${encodeURIComponent(userId)}`);
  if (!Array.isArray(results) || results.length === 0) throw new Error("ID not found");
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
  return `U-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

async function checkPresenceWithQR(userId) {
  const todayColumn = getTodayColumnName();
  
  try {
    const ipCheck = await checkIPValidity(userId);
    if (!ipCheck.valid) {
      showStatus(ipCheck.reason, "error");
      return;
    }

    const userData = await apiGetById(userId);
    const nomComplet = `${userData.Nom || ''} ${userData.Prénom || ''}`.trim() || "Utilisateur";

    if (userData.LienInvalide === "OUI") {
      showStatus(`❌ Ce QR a été DÉJÀ UTILISÉ.`, "error");
      return;
    }

    if (userData.DateExpiration && !isLinkStillValid(userData.DateExpiration)) {
      showStatus(`❌ QR EXPIRE après 1 min.`, "error");
      return;
    }

    if (userData[todayColumn] === "Présent") {
      showStatus(`✅ ${nomComplet} ! Déjà enregistré.`, "success");
      return;
    }

    const expirationDate = calculateExpirationDate();
    await apiPatchById(userId, { 
      [todayColumn]: "Présent",
      LienInvalide: "OUI",
      DateExpiration: expirationDate
    });

    showStatus(
      `🎉 ${nomComplet} ! Présence VALIDÉE !<br><small>🔒 IP ${ipCheck.ip.slice(0,8)}... 40 min</small>`,
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
  if ((type === "success" || type === "error") && typeof Swal !== "undefined") {
    Swal.fire({
      title: type === "success" ? "Succès" : "Erreur",
      html: message,
      icon: type === "success" ? "success" : "error",
      draggable: true
    });
  }
}

window.generateTestQR = async function(nom = "TEST", prenom = "USER") {
  try {
    const userId = generateUserId();
    const testUser = {
      ID: userId, Nom: nom, Prénom: prenom, Organisation: "TEST-EVENT",
      Telephone: "0000000000", Formation: "Bureautique appliquée",
      Dimanche: "", Lundi: "", Mardi: "", Mercredi: "", Jeudi: "", Vendredi: "", Samedi: "",
      LienInvalide: "", DateExpiration: "", IPUtilisateur: "", DateIPExpiration: "",
      "Date de création": new Date().toISOString()
    };
    
    await apiCreateUser(testUser);
    const qrLink = `${APP_BASE_URL}?userId=${userId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrLink)}&color=000000&bgcolor=FFFFFF&qzone=1`;
    
    console.log(`✅ ID: ${userId}\n🔗 ${qrLink}\n🖼️ ${qrUrl}`);
    window.open(qrUrl, '_blank');
    alert(`✅ QR généré ! Console F12`);
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// ✅ HTML COMPLET + BANNière (SYNTAXE VITÉ OK)
const app = document.querySelector("#app");
const urlParams = new URLSearchParams(window.location.search);
const qrUserId = urlParams.get('userId');

let htmlContent = `
<div class="app-bg">
  <div class="app-overlay">
   <!-- 🔥 BANNière -->
    <div class="banner-container">
      <img src="/banRegistre.png" alt="DGIeWOMEN" class="banner-image"/>
    </div>

    <br>
   `;

if (qrUserId) {
  htmlContent += `<div id="loading">🔍 Vérification QR + IP (40 min/jour)...</div>`;
} else {
  htmlContent += `
   
    <br>
    <form id="presence-form" autocomplete="off">
      <div class="form-group">
        <label class="form-label" data-for="nom">Nom</label>
        <input class="form-input" id="nom" name="nom" type="text" placeholder="Veuillez entrée votre Nom" required />
      </div>
      <div class="form-group">
        <label class="form-label" data-for="prenom">Prénom</label>
        <input class="form-input" id="prenom" name="prenom" type="text" placeholder="Veuillez entrée votre prénom" required />
      </div>
      <div class="form-group">
        <label class="form-label" data-for="organisation">Organisation / Service</label>
        <input class="form-input" id="organisation" name="organisation" type="text" placeholder="Poste/département" />
      </div>
      <div class="form-group">
        <label class="form-label" data-for="telephone">Téléphone</label>
        <input class="form-input" id="telephone" name="telephone" type="tel" placeholder="Numéro" required />
      </div>
      <div class="form-group">
        <label class="form-label" data-for="formation">Formation</label>
        <select class="form-input" id="formation" name="formation" required>
          <option value="">Choisissez votre formation</option>
          <option value="Bureautique appliquée">Bureautique appliquée</option>
          <option value="Cybersécurité">Cybersécurité & IA</option>
         
        </select>
      </div>
      <div class="ring">Chargement
  <span></span>
</div>
      <button type="submit" class="form-button" style="margin-top:10px;">Enregistrer ma présence
    </button>
    </form>`;
}

htmlContent += `
    <div id="form-message" class="form-message"></div>
    <div class="social-bar">
      <a href="https://www.digiewomenawards.com/" target="_blank" class="social-link">
        <img src="/web.jpg" alt="Digie" class="social-icon" />
      </a>
      <a href="https://www.linkedin.com/company/digiewomen-school/" target="_blank" class="social-link">
        <img src="/linkdin3.jpg" alt="LinkedIn" class="social-icon" />
      </a>
      <a href="https://www.facebook.com/digiewomenschool" target="_blank" class="social-link">
        <img src="/facebk.jpg" alt="Facebook" class="social-icon" />
      </a>
      <a href="https://whatsapp.com/channel/0029VaufFo67T8bY1a1drU15" target="_blank" class="social-link">
        <img src="/whats1.jpg" alt="WhatsApp" class="social-icon" />
      </a>
      <a href="https://www.instagram.com/digiewomenschool?igsh=MXNnZTQ2dDg2OHE0OA==" target="_blank" class="social-link">
        <img src="/ints.jpg" alt="Instagram" class="social-icon" />
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
  const loadingRing = document.querySelector(".ring");
  const setLoading = (isLoading) => {
    if (loadingRing) loadingRing.classList.toggle("is-active", isLoading);
    if (form) form.classList.toggle("is-loading", isLoading);
  };
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoading(true);
      const todayColumn = getTodayColumnName();
      const nom = document.querySelector("#nom").value.trim();
      const prenom = document.querySelector("#prenom").value.trim();
      const organisation = document.querySelector("#organisation").value.trim();
      const telephone = document.querySelector("#telephone").value.trim();
      const formation = document.querySelector("#formation").value;

      if (!nom || !prenom || !telephone || !formation) {
        showStatus("❌ Tous les champs requis sont obligatoires.", "error");
        setLoading(false);
        return;
      }

      try {
        await enforceAllowedNetwork();
        const existingUsers = await apiSearchByName(nom, prenom);
        let userId, isNewUser = false;

        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          userId = existingUsers[0].ID;
          const ipCheck = await checkIPValidity(userId);
          if (!ipCheck.valid) {
            showStatus(ipCheck.reason, "error");
            return;
          }
        } else {
          userId = generateUserId();
          isNewUser = true;
          const newUserPayload = {
            ID: userId, Nom: nom, Prénom: prenom, Organisation: organisation,
            Telephone: telephone, Formation: formation,
            Dimanche: "", Lundi: "", Mardi: "", Mercredi: "", Jeudi: "", Vendredi: "", Samedi: "",
            LienInvalide: "", DateExpiration: "", IPUtilisateur: "", DateIPExpiration: "",
            "Date de création": new Date().toISOString()
          };
          await apiCreateUser(newUserPayload);
        }

        await apiPatchById(userId, { [todayColumn]: "Présent" });
        showStatus(isNewUser ? 
          `🎉 ${nom} ${prenom} ! Enregistrement réussie !<br>` : 
          "✅ Présence enregistrée !", "success");
        form.reset();
      } catch (error) {
        showStatus("❌ Erreur: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    });
  }
}

init();
