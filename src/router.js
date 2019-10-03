import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
import NotFound from "./views/NotFound";
import VueYoutube from "vue-youtube";
import VueObserveVisibility from "vue-observe-visibility";

Vue.use(Router);
Vue.use(VueYoutube);
Vue.use(VueObserveVisibility);

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      component: Home,
      meta: {
        title: "Home"
      }
    },
    {
      path: "/login",
      name: "login",
      component: () => import("./views/Login"),
      meta: {
        title: "Login"
      }
    },
    {
      path: "/sign-up",
      name: "sign-up",
      component: () => import("./views/SignUp"),
      meta: {
        title: "Sign Up"
      }
    },
    {
      path: "/r/:id",
      name: "room",
      component: () => import("./views/Room")
    },
    {
      path: "/reset-password",
      name: "reset-password",
      component: () => import("./views/ResetPassword"),
      meta: {
        title: "Reset Password"
      }
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("./views/Profile"),
      meta: {
        title: "Profile"
      }
    },
    {
      path: "/rooms",
      name: "rooms",
      component: () => import("./views/Rooms"),
      meta: {
        title: "Rooms"
      }
    },
    {
      path: "*",
      component: NotFound,
      meta: {
        title: "404 Not Found"
      }
    }
  ]
});
