// main.js COMPLET - ANTI-TRICHERIE + MESSAGE PERSONNALISÉ
import "./style.css";
import 'animate.css';

const API_URL = "https://sheetdb.io/api/v1/f7c1tqp21ex4d";

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
    const userRes = await fetch(`${API_URL}/ID/${userId}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      return `${userData.Nom} ${userData.Prénom}`;
    }
  } catch (e) {
    return "Utilisateur";
  }
  return "Utilisateur";
}

// ✅ QR PROFESSIONNEL via API QRServer
async function generateAndDownloadQR(userId, nom, prenom) {
  const qrLink = `${window.location.origin}${window.location.pathname}?userId=${userId}`;
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

// ✅ VÉRIFICATION ANTI-TRICHERIE + MESSAGE PERSONNALISÉ
async function checkPresenceWithQR(userId) {
  const todayColumn = getTodayColumnName();
  
  try {
    // Récupérer infos utilisateur
    const userRes = await fetch(`${API_URL}/ID/${userId}`);
    const userData = await userRes.json();
    
    if (!userRes.ok) {
      showStatus("❌ Utilisateur introuvable. Veuillez vous réinscrire.", "error");
      return;
    }

    const nomComplet = `${userData.Nom || ''} ${userData.Prénom || ''}`.trim() || "Utilisateur";

    // ✅ ANTI-TRICHERIE : Vérifier si déjà présent aujourd'hui
    if (userData[todayColumn] === "Présent") {
      showStatus(
        `✅ Bonjour ${nomComplet} ! Vous êtes <strong>DÉJÀ enregistré</strong> pour aujourd'hui (${todayColumn.toLowerCase()}).`, 
        "success"
      );
      return;
    }

    // Marquer présent (1 seule fois/jour)
    const updateBody = { data: { [todayColumn]: "Présent" } };
    const updateRes = await fetch(`${API_URL}/ID/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateBody)
    });

    if (updateRes.ok) {
      // ✅ MESSAGE PERSONNALISÉ AVEC SUCCÈS
      showStatus(
        `🎉 ${nomComplet} ! Votre présence du <strong>${todayColumn.toLowerCase()}</strong> est bien <strong>ENREGISTRÉE</strong> !`, 
        "success"
      );
    } else {
      throw new Error("Erreur enregistrement");
    }
    
  } catch (error) {
    showStatus("❌ Erreur technique. Veuillez vous réinscrire.", "error");
  }
}

function showStatus(message, type) {
  const messageBox = document.querySelector("#form-message");
  messageBox.innerHTML = message; // HTML autorisé pour <strong>
  messageBox.className = `form-message form-message--${type}`;
}

const app = document.querySelector("#app");
const urlParams = new URLSearchParams(window.location.search);
const qrUserId = urlParams.get('userId');

let htmlContent = `
  <div class="app-bg">
    <div class="app-overlay">
      <h1 class="animate__animated animate__bounce">Régistre de présence</h1>
      <p class="form-subtitle">Scannez votre QR Code personnel ou enregistrez-vous</p>`;

if (qrUserId) {
  htmlContent += `<div id="loading">🔍 Vérification de votre présence...</div>`;
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
        <button type="submit" class="form-button">Enregistrer ma présence</button>
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
    // ✅ Scan QR → Message personnalisé + anti-tricherie
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

      if (!nom || !prenom) {
        showStatus("❌ Nom et prénom requis.", "error");
        return;
      }

      try {
        const searchUrl = `${API_URL}/search?Nom=${encodeURIComponent(nom)}&Prénom=${encodeURIComponent(prenom)}`;
        const searchRes = await fetch(searchUrl);
        const existingUsers = await searchRes.json();

        let userId, isNewUser = false;

        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          userId = existingUsers[0].ID;
        } else {
          userId = generateUserId();
          isNewUser = true;
          
          const createBody = {
            data: [{
              ID: userId,
              Nom: nom,
              Prénom: prenom,
              Organisation: organisation,
              Dimanche: "", Lundi: "", Mardi: "", Mercredi: "",
              Jeudi: "", Vendredi: "", Samedi: "",
              "Date de création": new Date().toISOString()
            }]
          };
          
          await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(createBody)
          });
        }

        const updateBody = { data: { [todayColumn]: "Présent" } };
        await fetch(`${API_URL}/ID/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody)
        });

        if (isNewUser) {
          showStatus("🎉 Premier enregistrement ! Votre QR Code se télécharge...", "success");
          await generateAndDownloadQR(userId, nom, prenom);
          
          setTimeout(() => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?userId=${userId}`)}`;
            const qrImg = document.createElement('img');
            qrImg.src = qrUrl;
            qrImg.style.maxWidth = '250px';
            qrImg.style.marginTop = '20px';
            qrImg.style.border = '4px solid #2c5aa0';
            qrImg.style.borderRadius = '12px';
            document.querySelector("#form-message").appendChild(qrImg);
          }, 1000);
        } else {
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
