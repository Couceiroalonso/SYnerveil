// Synerveil web: accounts (Firebase Authentication) and saving (Firestore) for the same app that runs inside Claude.
// The app asks for claude.use("db"), claude.use("user") and claude.use("downloads"); this file answers with Firebase
// and a normal browser download. There is no Claude here, so window.SYNERVEIL_WEB turns on Synerveil's own engine.
import {
  initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  updateProfile, signOut, setPersistence, browserLocalPersistence,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot,
} from "./fb.js";   // Firebase 10.12.2, bundled here so the app also opens with no connection
import { firebaseConfig } from "./firebase-config.js";

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const configured = firebaseConfig && firebaseConfig.apiKey && !/PEGA|TU_/.test(firebaseConfig.apiKey);
let app, auth, fs;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app); auth.languageCode = "es";
  // works offline at the table: the data is cached on the phone and syncs when there's signal
  fs = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}

// ---------- the bridge the app expects ----------
let signedIn; const ready = new Promise(res => { signedIn = res; });
// Firestore can't store arrays inside arrays (the game logs have them), so each document is kept as JSON text.
const pack = o => ({ j: JSON.stringify(o), t: Date.now() });
const unpack = snap => { const x = snap.data(); return x && typeof x.j === "string" ? JSON.parse(x.j) : x; };
function collRef(path) {
  return {
    doc: id => ({ set: o => setDoc(doc(fs, path, id), pack(o)), delete: () => deleteDoc(doc(fs, path, id)) }),
    onSnapshot: (cb, err) => onSnapshot(collection(fs, path), s => cb({ docs: s.docs.map(d => ({ id: d.id, data: () => unpack(d) })) }), err),
  };
}
const dbApi = { doc: path => ({ collection: name => collRef(path + "/" + name) }) };
const downloads = {
  async save({ filename, data }) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { status: "saved" };
  },
};
// index.html already put a waiting window.claude in place (the app starts before this module loads); hand it the real one
const bridge = {
  use: async name => {
    if (name === "downloads") return downloads;
    if (name === "db") { if (!configured) return null; await ready; return dbApi; }
    if (name === "user") { if (!configured) return null; const u = await ready; return { id: async () => u.uid, me: async () => ({ id: u.uid, name: u.displayName || "" }), isOwner: () => true, canEdit: () => true }; }
    return null;
  },
};
window.__setClaude ? window.__setClaude(bridge) : (window.claude = bridge);

// ---------- sign in / sign up ----------
const ERR = {
  "auth/invalid-email": "Ese correo no es válido.", "auth/missing-email": "Escribe tu correo.", "auth/missing-password": "Escribe tu contraseña.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.", "auth/email-already-in-use": "Ya hay una cuenta con ese correo. Entra o recupera la contraseña.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.", "auth/wrong-password": "Correo o contraseña incorrectos.", "auth/user-not-found": "No hay ninguna cuenta con ese correo.",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.", "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
  "auth/operation-not-allowed": "El registro con correo no está activado en Firebase (mira la guía).", "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "Los datos de firebase-config.js no son correctos (revisa la apiKey).", "auth/invalid-api-key": "Los datos de firebase-config.js no son correctos (revisa la apiKey).",
  "auth/unauthorized-domain": "Esta dirección no está autorizada en Firebase (mira la guía, paso de Dominios autorizados).",
};
const authErr = e => ERR[e && e.code] || "Algo ha fallado. Vuelve a intentarlo.";
function gate(html) {
  let g = $("#authGate");
  if (!g) { g = document.createElement("div"); g.id = "authGate"; document.body.appendChild(g); }
  g.innerHTML = `<div class="ag-box"><img src="emblem.png" alt="" width="84" height="86"><h1>Synerveil</h1><p class="ag-tag">Collect · Brew · Command</p>${html}</div>`;
  g.hidden = false; return g;
}
function msg(t, ok) { const m = $("#authGate .ag-msg"); if (m) { m.textContent = t; m.className = "ag-msg" + (ok ? " ok" : ""); } }
function busy(f, on) { for (const el of f.querySelectorAll("button, input")) el.disabled = on; }
function login(email = "") {
  gate(`<form id="agLogin" novalidate><h2>Entra en tu cuenta</h2>
    <label>Correo<input type="email" id="agEmail" autocomplete="email" inputmode="email" value="${esc(email)}"></label>
    <label>Contraseña<input type="password" id="agPass" autocomplete="current-password"></label>
    <p class="ag-msg" role="alert"></p>
    <button class="btn primary" type="submit">Entrar</button>
    <div class="ag-links"><button type="button" id="agToSign">Crear cuenta</button><button type="button" id="agToReset">¿Olvidaste la contraseña?</button></div></form>`);
  const f = $("#agLogin");
  f.onsubmit = async e => { e.preventDefault(); busy(f, true); msg(""); try { await signInWithEmailAndPassword(auth, $("#agEmail").value.trim(), $("#agPass").value); } catch (err) { msg(authErr(err)); busy(f, false); } };
  $("#agToSign").onclick = () => signup($("#agEmail").value.trim());
  $("#agToReset").onclick = () => reset($("#agEmail").value.trim());
}
function signup(email = "") {
  gate(`<form id="agSign" novalidate><h2>Crea tu cuenta</h2>
    <label>Tu nombre<input type="text" id="agName" autocomplete="nickname" maxlength="40" placeholder="Como te llaman en la mesa"></label>
    <label>Correo<input type="email" id="agEmail" autocomplete="email" inputmode="email" value="${esc(email)}"></label>
    <label>Contraseña<input type="password" id="agPass" autocomplete="new-password" placeholder="Al menos 6 caracteres"></label>
    <label>Repite la contraseña<input type="password" id="agPass2" autocomplete="new-password"></label>
    <p class="ag-msg" role="alert"></p>
    <button class="btn primary" type="submit">Crear cuenta</button>
    <div class="ag-links"><button type="button" id="agToLogin">Ya tengo cuenta</button></div></form>`);
  const f = $("#agSign");
  f.onsubmit = async e => {
    e.preventDefault(); msg("");
    const name = $("#agName").value.trim(), email2 = $("#agEmail").value.trim(), pass = $("#agPass").value;
    if (pass !== $("#agPass2").value) { msg("Las contraseñas no coinciden."); return; }
    busy(f, true);
    try { const c = await createUserWithEmailAndPassword(auth, email2, pass); if (name) await updateProfile(c.user, { displayName: name }); }
    catch (err) { if (f.isConnected) { msg(authErr(err)); busy(f, false); } }
  };
  $("#agToLogin").onclick = () => login($("#agEmail").value.trim());
}
function reset(email = "") {
  gate(`<form id="agReset" novalidate><h2>Recuperar contraseña</h2>
    <p class="ag-note">Te mandamos un correo para elegir una contraseña nueva.</p>
    <label>Correo<input type="email" id="agEmail" autocomplete="email" inputmode="email" value="${esc(email)}"></label>
    <p class="ag-msg" role="alert"></p>
    <button class="btn primary" type="submit">Enviar correo</button>
    <div class="ag-links"><button type="button" id="agToLogin">Volver</button></div></form>`);
  const f = $("#agReset");
  f.onsubmit = async e => { e.preventDefault(); busy(f, true); try { await sendPasswordResetEmail(auth, $("#agEmail").value.trim()); msg("Hecho. Mira tu correo (y la carpeta de spam).", true); } catch (err) { msg(authErr(err)); } busy(f, false); };
  $("#agToLogin").onclick = () => login($("#agEmail").value.trim());
}
function accountChip(u) {
  const note = $("#storeNote"); if (!note || $("#agAccount")) return;
  const b = document.createElement("button");
  b.id = "agAccount"; b.type = "button"; b.className = "ag-account";
  b.textContent = (u.displayName || u.email || "Cuenta") + " · Salir";
  b.title = "Cerrar sesión";
  b.onclick = async () => { if (b.dataset.arm !== "1") { b.dataset.arm = "1"; b.textContent = "Toca otra vez para cerrar sesión"; setTimeout(() => { b.dataset.arm = ""; b.textContent = (u.displayName || u.email || "Cuenta") + " · Salir"; }, 3000); return; } await signOut(auth); location.reload(); };
  note.insertAdjacentElement("afterend", b);
}

if (!configured) {
  // still works without accounts: everything stays in this browser
  console.warn("Synerveil: falta firebase-config.js; se guarda solo en este navegador.");
} else {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  onAuthStateChanged(auth, u => {
    if (u) { const g = $("#authGate"); if (g) g.hidden = true; signedIn(u); if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => accountChip(u)); else accountChip(u); }
    else { const show = () => login(); if (document.readyState === "loading") addEventListener("DOMContentLoaded", show); else show(); }
  });
}

// offline cache and "install as app"
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
