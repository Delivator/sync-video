import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
const firebaseConfig = require("./firebaseConfig");

firebase.initializeApp(firebaseConfig.firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
let currentUser = auth.currentUser;
let token;

const rooms = db.collection("rooms");
const user_settings = db.collection("user_settings");

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user)
    user
      .getIdToken()
      .then(token2 => {
        token = token2;
      })
      .catch(console.error);
});

export { firebase, db, auth, currentUser, rooms, user_settings, token };
