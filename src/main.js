import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
const fb = require("./fb");

Vue.config.productionTip = false;

router.beforeEach((to, from, next) => {
  document.title = to.meta.title
    ? "Sync Video - " + to.meta.title
    : "Sync Video";
  next();
});

fb.auth.onAuthStateChanged(() => {
  new Vue({
    router,
    vuetify,
    render: h => h(App)
  }).$mount("#app");
});
