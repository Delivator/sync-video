import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'
import Login from "./views/Login"
import SignUp from "./views/SignUp"
import Room from "./views/Room"
import NotFound from "./views/NotFound"
import ResetPassword from "./views/ResetPassword"

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      component: Home,
      meta: {
        title: "Home"
      }
    }, {
      path: '/login',
      component: Login
    }, {
      path: '/sign-up',
      component: SignUp
    }, {
      path: "/r/:id",
      component: Room
    }, {
      path: "/reset-password",
      component: ResetPassword
    }, {
      path: "*",
      component: NotFound
    }
  ]
})