import Vue from 'vue'
import firebase from "firebase"
import "./plugins/vuetify"
import App from "./App.vue"
import router from "./router"
import firebaseConfig from "./firebase.json"

Vue.config.productionTip = false

firebase.initializeApp(firebaseConfig.config);

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
