// main.js COMPLET - ANTI-TRICHERIE + MESSAGE PERSONNALISÉ + BOUTON PRÉSENCE RAPIDE ✅
import "./style.css";
import 'animate.css';

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";
// 👉 Remplace cette URL par celle de ton site Vercel en ligne
const APP_BASE_URL = "https://r-gistre-by-phila-inc.vercel.app";

// Utilitaires API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;

  // Certaines erreurs SheetDB renvoient aussi du JSON, on essaie sans planter
  try {
    data = await response.json();
  } catch (e) {
    // Pas de JSON exploitable, on laisse data à null
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Erreur réseau (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function apiGetById(userId) {
  // On certaines configurations, le endpoint /ID/:id peut renvoyer 405.
  // On passe donc par /search, qui est déjà vérifié comme fonctionnant (voir logs H7/H9).
  const results = await apiRequest(
    `${API_URL}/search?ID=${encodeURIComponent(userId)}`
  );

  if (!Array.isArray(results) || results.length === 0) {
    const notFoundError = new Error("404: ID not found");
    throw notFoundError;
  }

  return results[0];
}

async function apiSearchByName(nom, prenom) {
  const searchUrl = `${API_URL}/search?Nom=${encodeURIComponent(
    nom
  )}&Prénom=${encodeURIComponent(prenom)}`;
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

// Message personnalisé avec infos utilisateur
async function getUserInfo(userId) {
  try {
    const userData = await apiGetById(userId);
    return `${userData.Nom} ${userData.Prénom}`;
  } catch (e) {
    return "Utilisateur";
  }
}

// ✅ QR PROFESSIONNEL via API QRServer
async function generateAndDownloadQR(userId, nom, prenom) {
  const qrLink = `${APP_BASE_URL}?userId=${userId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrLink)}&color=000000&bgcolor=FFFFFF&qzone=1`;
  
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#2c5aa0';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 300, 300);
  
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  qrImg.onload = function() {
    ctx.drawImage(qrImg, 20, 20, 300, 300);
    ctx.fillStyle = '#2c5aa0';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${nom.toUpperCase()} ${prenom.toUpperCase()}`, 170, 360);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('QR CODE PRÉSENCE', 170, 395);
    
    const finalDataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = finalDataUrl;
    link.download = `Presence_${nom}_${prenom}_${userId}.png`;
    link.click();
  };
  qrImg.src = qrUrl;
  
  return qrUrl;
}

// ✅ QR CODE GLOBAL (UNIQUE) POUR L'ÉVÉNEMENT
// Ce QR pointe vers APP_BASE_URL?eventQr=1 et permet à n'importe quel participant
// de scanner pour marquer sa présence via une recherche Nom/Prénom.
let globalQRGenerated = false;
async function generateGlobalPresenceQR({ force = false } = {}) {
  // Empêche les téléchargements en boucle si la fonction est appelée plusieurs fois involontairement
  if (globalQRGenerated && !force) {
    console.warn("QR global déjà généré sur cette page. Passez { force: true } pour regénérer.");
    return null;
  }
  globalQRGenerated = true;

  const qrLink = `${APP_BASE_URL}?eventQr=1`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrLink)}&color=000000&bgcolor=FFFFFF&qzone=1`;
  
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#2c5aa0';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 300, 300);
  
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  qrImg.onload = function() {
    ctx.drawImage(qrImg, 20, 20, 300, 300);
    ctx.fillStyle = '#2c5aa0';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`QR PRÉSENCE`, 170, 360);
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('SCANNER POUR SIGNER', 170, 395);
    
    const finalDataUrl = canvas.toDataURL('image/png');
    // On ne déclenche plus de téléchargement automatique pour éviter les boucles.
    // On expose juste l'URL dans la console pour que tu puisses l'ouvrir / enregistrer manuellement.
    if (typeof window !== "undefined") {
      window.LAST_GLOBAL_QR = finalDataUrl;
      console.log("QR global généré. Copie/ouvre window.LAST_GLOBAL_QR pour l'enregistrer.");
    }
  };
  qrImg.src = qrUrl;
  
  return qrUrl;
}

// Rendre accessible depuis la console du navigateur
if (typeof window !== "undefined") {
  window.generateGlobalPresenceQR = generateGlobalPresenceQR;
}

// ✅ VÉRIFICATION ANTI-TRICHERIE + MESSAGE PERSONNALISÉ (pour QR)
async function checkPresenceWithQR(userId) {
  const todayColumn = getTodayColumnName();
  
  try {
    const userData = await apiGetById(userId);

    const nomComplet = `${userData.Nom || ''} ${userData.Prénom || ''}`.trim() || "Utilisateur";

    if (userData[todayColumn] === "Présent") {
      // Mémoriser l'ID sur l'appareil pour les prochains scans du QR global
      try {
        window.localStorage.setItem('presenceUserId', userId);
      } catch (e) {
        // ignore stockage local si désactivé
      }
      showStatus(
        `✅ Bonjour ${nomComplet} ! Vous êtes <strong>DÉJÀ enregistré</strong> pour aujourd'hui (${todayColumn.toLowerCase()}).`, 
        "success"
      );
      return;
    }

    await apiPatchById(userId, { [todayColumn]: "Présent" });
    try {
      window.localStorage.setItem('presenceUserId', userId);
    } catch (e) {
      // ignore stockage local si désactivé
    }
    showStatus(
      `🎉 ${nomComplet} ! Votre présence du <strong>${todayColumn.toLowerCase()}</strong> est bien <strong>ENREGISTRÉE</strong> !`,
      "success"
    );
    
  } catch (error) {
    console.error("Erreur checkPresenceWithQR:", error);
    const message = String(error && error.message ? error.message : error);
    const errorDetails = message || String(error) || "Erreur inconnue";

    // Toujours afficher le détail de l'erreur pour faciliter le debug
    if (errorDetails.includes("404") || errorDetails.includes("not found") || errorDetails.includes("introuvable")) {
      showStatus(`❌ Utilisateur introuvable (${errorDetails}). Veuillez vous réinscrire.`, "error");
    } else {
      showStatus(`❌ Erreur technique: ${errorDetails}. Veuillez réessayer ou vous réinscrire.`, "error");
    }
  }
}

// ✅ PRÉSENCE RAPIDE PAR NOM/PRÉNOM ✅
async function quickPresenceCheck(nom, prenom) {
  const todayColumn = getTodayColumnName();
  const statusEl = document.getElementById('quick-status');
  
  try {
    statusEl.innerHTML = "🔍 Vérification...";
    statusEl.className = 'form-message form-message--info';

    // Recherche SheetDB (exact match)
    const users = await apiSearchByName(nom, prenom);

    if (!Array.isArray(users) || users.length === 0) {
      statusEl.innerHTML = "❌ Non trouvé. <strong>Remplissez le formulaire complet</strong> pour vous identifier.";
      statusEl.className = 'form-message form-message--error';
      setTimeout(() => {
        document.getElementById('quick-form').style.display = 'none';
        document.getElementById('presence-form').style.display = 'block';
      }, 2000);
      return;
    }

    const user = users[0];
    const nomComplet = `${user.Nom || ''} ${user.Prénom || ''}`.trim() || "Utilisateur";

    if (user[todayColumn] === "Présent") {
      statusEl.innerHTML = `✅ ${nomComplet} ! Vous êtes <strong>DÉJÀ enregistré</strong> pour ${todayColumn.toLowerCase()}.`;
      statusEl.className = 'form-message form-message--success';
      return;
    }

    await apiPatchById(user.ID, { [todayColumn]: "Présent" });
    statusEl.innerHTML = `🎉 ${nomComplet} ! Présence <strong>${todayColumn.toLowerCase()}</strong> enregistrée !`;
    statusEl.className = 'form-message form-message--success';
    
    // Reset quick form
    document.getElementById('quick-nom').value = '';
    document.getElementById('quick-prenom').value = '';

  } catch (error) {
    statusEl.innerHTML = `❌ Erreur: ${error.message}`;
    statusEl.className = 'form-message form-message--error';
  }
}

// ✅ PRÉSENCE VIA QR GLOBAL (eventQr=1)
// - Si l'utilisateur existe (Nom/Prénom), on marque "Présent" pour aujourd'hui.
// - Sinon, on redirige automatiquement vers le formulaire complet (APP_BASE_URL).
async function eventQrPresenceCheck(nom, prenom) {
  const todayColumn = getTodayColumnName();
  const statusEl = document.getElementById('event-status');
  
  try {
    statusEl.innerHTML = "🔍 Vérification dans le registre...";
    statusEl.className = 'form-message form-message--info';

    const users = await apiSearchByName(nom, prenom);

    if (!Array.isArray(users) || users.length === 0) {
      statusEl.innerHTML = "❌ Vous n'êtes pas encore inscrit(e). Redirection vers le formulaire d'inscription...";
      statusEl.className = 'form-message form-message--error';
      setTimeout(() => {
        window.location.href = APP_BASE_URL;
      }, 2000);
      return;
    }

    const user = users[0];
    const nomComplet = `${user.Nom || ''} ${user.Prénom || ''}`.trim() || "Utilisateur";

    if (user[todayColumn] === "Présent") {
      statusEl.innerHTML = `✅ ${nomComplet} ! Votre présence de ${todayColumn.toLowerCase()} est déjà enregistrée.`;
      statusEl.className = 'form-message form-message--success';
      return;
    }

    await apiPatchById(user.ID, { [todayColumn]: "Présent" });
    statusEl.innerHTML = `🎉 ${nomComplet} ! Votre présence de <strong>${todayColumn.toLowerCase()}</strong> est bien enregistrée !`;
    statusEl.className = 'form-message form-message--success';

    // Nettoyage des champs
    const nomInput = document.getElementById('event-nom');
    const prenomInput = document.getElementById('event-prenom');
    if (nomInput) nomInput.value = '';
    if (prenomInput) prenomInput.value = '';

  } catch (error) {
    statusEl.innerHTML = `❌ Erreur: ${error.message}`;
    statusEl.className = 'form-message form-message--error';
  }
}

function showStatus(message, type) {
  const messageBox = document.querySelector("#form-message");
  if (messageBox) {
    messageBox.innerHTML = message;
    messageBox.className = `form-message form-message--${type}`;
  }
}

const app = document.querySelector("#app");
const urlParams = new URLSearchParams(window.location.search);
const qrUserId = urlParams.get('userId');
const isEventQR = urlParams.get('eventQr') === '1';

let htmlContent = `
  <div class="app-bg">
    <div class="app-overlay">
      <h1 class="animate__animated animate__bounce">Régistre de présence</h1>
      <p class="form-subtitle">Scannez votre QR Code personnel ou enregistrez-vous</p>`;

if (qrUserId) {
  htmlContent += `<div id="loading">🔍 Vérification de votre présence...</div>`;
} else if (isEventQR) {
  // Vue spéciale pour le QR global : vérification automatique via userId stocké
  htmlContent += `
      <div id="loading">🔍 Vérification de votre présence...</div>
      <div id="event-status" class="form-message"></div>`;
} else {
  htmlContent += `
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
        <!-- ✅ BOUTON PRÉSENCE RAPIDE -->
        <button type="button" id="quick-check-btn" class="btn-quick-check">📱 Présence rapide</button>
        <div id="quick-form" style="display:none;">
          <input type="text" id="quick-nom" placeholder="Votre nom" />
          <input type="text" id="quick-prenom" placeholder="Votre prénom" />
          <button type="button" id="submit-quick" class="form-button">Valider présence</button>
        </div>
        <div id="quick-status" class="form-message"></div>
        <button type="submit" id="submit-full" class="form-button" style="margin-top: 10px;">Enregistrer ma présence (complet)</button>
      </form>`;
}

htmlContent += `
      <div id="form-message" class="form-message"></div>
      <div class="social-bar">
        <a href="https://www.digiewomenawards.com/" target="_blank" class="social-link">
          <img src="/digie.jpeg" alt="Digie" class="social-icon" />
        </a>
        <a href="https://www.linkedin.com/in/ton-profil" target="_blank" class="social-link">
          <img src="/linkdin.jpg" alt="LinkedIn" class="social-icon" />
        </a>
        <a href="https://www.facebook.com/femmedigitaleafrique" target="_blank" class="social-link">
          <img src="/facebook.jpg" alt="Facebook" class="social-icon" />
        </a>
        <a href="https://whatsapp.com/channel/0029Vb6foT6EQIaoB06z8m1F-link" target="_blank" class="social-link">
          <img src="/whatsapp.jpg" alt="WhatsApp" class="social-icon" />
        </a>
        <a href="https://www.instagram.com/ton-compte" target="_blank" class="social-link">
          <img src="/Insta.jpg" alt="Instagram" class="social-icon" />
        </a>
      </div>
    </div>
  </div>`;

app.innerHTML = htmlContent;

async function init() {
  if (qrUserId) {
    await checkPresenceWithQR(qrUserId);
    return;
  }

  // Mode QR global (un seul QR pour tous, basé sur l'ID stocké sur l'appareil)
  if (isEventQR) {
    const eventStatus = document.getElementById('event-status');
    const loading = document.getElementById('loading');

    const storedId = window.localStorage.getItem('presenceUserId');

    if (!storedId) {
      if (loading) loading.style.display = 'none';
      if (eventStatus) {
        eventStatus.innerHTML = `❌ Aucun profil enregistré sur cet appareil.<br>
          <a href="${APP_BASE_URL}" style="color:#4ea5ff; text-decoration:underline;">Cliquez ici pour vous inscrire</a>.`;
        eventStatus.className = 'form-message form-message--error';
      }
      return;
    }

    // Si on a déjà un ID, on utilise immédiatement le flux QR par ID
    await checkPresenceWithQR(storedId);
    if (loading) loading.style.display = 'none';

    return;
  }

  // ✅ Écouteurs bouton présence rapide
  const quickBtn = document.getElementById('quick-check-btn');
  const submitQuick = document.getElementById('submit-quick');
  
  if (quickBtn) {
    quickBtn.addEventListener('click', () => {
      document.getElementById('quick-form').style.display = 'block';
      document.getElementById('submit-full').style.display = 'none';
    });
  }

  if (submitQuick) {
    submitQuick.addEventListener('click', async () => {
      const nom = document.getElementById('quick-nom').value.trim();
      const prenom = document.getElementById('quick-prenom').value.trim();
      if (nom && prenom) {
        await quickPresenceCheck(nom, prenom);
      } else {
        document.getElementById('quick-status').innerHTML = "❌ Nom et prénom requis.";
        document.getElementById('quick-status').className = 'form-message form-message--error';
      }
    });
  }

  // Formulaire complet
  const form = document.querySelector("#presence-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const todayColumn = getTodayColumnName();
      const nom = document.querySelector("#nom").value.trim();
      const prenom = document.querySelector("#prenom").value.trim();
      const organisation = document.querySelector("#organisation").value.trim();

      if (!nom || !prenom) {
        showStatus("❌ Nom et prénom requis.", "error");
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
            Dimanche: "", Lundi: "", Mardi: "", Mercredi: "",
            Jeudi: "", Vendredi: "", Samedi: "",
            "Date de création": new Date().toISOString()
          };

          await apiCreateUser(newUserPayload);
        }

        await apiPatchById(userId, { [todayColumn]: "Présent" });

        if (isNewUser) {
          // Mémoriser l'ID nouvellement créé pour les prochains scans du QR global
          try {
            window.localStorage.setItem('presenceUserId', userId);
          } catch (e) {
            // ignore stockage local si désactivé
          }
          const profileLink = `${APP_BASE_URL}?userId=${userId}`;
          showStatus(
            `🎉 Premier enregistrement ! Votre QR Code se télécharge...<br>
             <small>Ou cliquez sur ce lien pour mettre votre présence à jour : 
             <a href="${profileLink}" target="_blank" rel="noopener noreferrer">${profileLink}</a></small>`,
            "success"
          );
          await generateAndDownloadQR(userId, nom, prenom);
          
          setTimeout(() => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${APP_BASE_URL}?userId=${userId}`)}`;
            const qrImg = document.createElement('img');
            qrImg.src = qrUrl;
            qrImg.style.maxWidth = '250px';
            qrImg.style.marginTop = '20px';
            qrImg.style.border = '4px solid #2c5aa0';
            qrImg.style.borderRadius = '12px';
            document.querySelector("#form-message").appendChild(qrImg);
          }, 1000);
        } else {
          try {
            window.localStorage.setItem('presenceUserId', userId);
          } catch (e) {
            // ignore stockage local si désactivé
          }
          showStatus("✅ Présence enregistrée ! Utilisez votre QR Code.", "success");
        }

        form.reset();
      } catch (error) {
        showStatus("❌ Erreur: " + error.message, "error");
      }
    });
  }
}

init();
