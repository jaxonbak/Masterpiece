// Masterpiece - Firebase sync layer
// Public read of one shared document; writes restricted to the owner account.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const OWNER_EMAIL = 'jaxonbak@gmail.com';

const app = initializeApp(window.__MP_CONFIG__);
const auth = getAuth(app);
const db = getFirestore(app);
const ref = doc(db, 'masterpiece', 'list');

let saveTimer = null;
let lastPushed = '';

const MP = {
  user: null,
  isOwner: false,
  status: 'connecting',
  lastError: '',

  signIn: function () {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(function (err) {
      MP.status = 'error';
      MP.lastError = (err && err.code) ? err.code : String(err);
      if (window.onCloudStatus) window.onCloudStatus();
    });
  },

  signOut: function () { signOut(auth); },

  push: function (payload) {
    if (!MP.isOwner) return;
    const body = JSON.stringify(payload);
    if (body === lastPushed) return;
    lastPushed = body;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      MP.status = 'saving';
      if (window.onCloudStatus) window.onCloudStatus();
      setDoc(ref, {
        seen: payload.seen || {},
        favorites: payload.favorites || {},
        priority: payload.priority || {},
        notes: payload.notes || {},
        updatedAt: Date.now()
      }).then(function () {
        MP.status = 'synced';
        if (window.onCloudStatus) window.onCloudStatus();
      }).catch(function (err) {
        MP.status = 'error';
        MP.lastError = (err && err.code) ? err.code : String(err);
        if (window.onCloudStatus) window.onCloudStatus();
      });
    }, 400);
  }
};

window.MP = MP;

onAuthStateChanged(auth, function (user) {
  MP.user = user || null;
  MP.isOwner = !!(user && user.email === OWNER_EMAIL);
  if (window.onCloudStatus) window.onCloudStatus();
});

onSnapshot(ref, function (snap) {
  const data = snap.exists() ? snap.data() : {};
  if (MP.status !== 'saving') MP.status = 'synced';
  if (window.onCloudState) {
    window.onCloudState({
      seen: data.seen || {},
      favorites: data.favorites || {},
      priority: data.priority || {},
      notes: data.notes || {}
    });
  }
}, function (err) {
  MP.status = 'error';
  MP.lastError = (err && err.code) ? err.code : String(err);
  if (window.onCloudStatus) window.onCloudStatus();
});
