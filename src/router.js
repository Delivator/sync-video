import Vue from "vue"
import Router from "vue-router"
import Home from "./views/Home.vue"
import NotFound from "./views/NotFound"
import VueYoutube from "vue-youtube"

Vue.use(Router)
Vue.use(VueYoutube)

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
    }, {
      path: "/login",
      name: "login",
      component: () => import("./views/Login")
    }, {
      path: "/sign-up",
      name: "sign-up",
      component: () => import("./views/SignUp")
    }, {
      path: "/r/:id",
      name: "room",
      component: () => import("./views/Room")
    }, {
      path: "/reset-password",
      name: "reset-password",
      component: () => import("./views/ResetPassword")
    }, {
      path: "/profile",
      name: "profile",
      component: () => import("./views/Profile")
    }, {
      path: "/rooms",
      name: "rooms",
      component: () => import("./views/Rooms")
    }, {
      path: "*",
      component: NotFound
    }
  ]
})
