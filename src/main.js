import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import "./registerServiceWorker";
import vuetify from "./plugins/vuetify";
import firebase from "firebase/app";
import firebaseConfig from "./firebase.json";

Vue.config.productionTip = false;

firebase.initializeApp(firebaseConfig.config);

new Vue({
  router,
  vuetify,
  render: h => h(App)
}).$mount("#app");
