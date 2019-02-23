<template>
  <v-app :dark="darkMode">
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <router-link to="/" :class="darkMode ? 'white--text' : 'black--text'">
          <span>SYNC-VIDEO</span>
          <span class="font-weight-light">.ME</span>
        </router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!currentUser" raised to="/login">
        <span>Login</span>
      </v-btn>
      <v-menu offset-y>
        <v-avatar v-if="currentUser && currentUser.email" slot="activator">
          <img :src="getGravatarUrl(currentUser.email)" alt="avatar">
        </v-avatar>
        <v-btn v-else fab small slot="activator">
          <v-icon>settings</v-icon>
        </v-btn>
        <v-list>
          <v-list-tile to="/profile" v-if="currentUser">
            <v-list-tile-action>
              <v-icon>person</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>Profile</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <v-list-tile to="/rooms" v-if="currentUser">
            <v-list-tile-action>
              <v-icon>menu</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>Rooms</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <v-list-tile @click="toggleDarkMode">
            <v-list-tile-action>
              <v-icon>invert_colors</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>Toggle dark mode</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <v-divider v-if="currentUser"></v-divider>
          <v-list-tile @click="signOut" v-if="currentUser">
            <v-list-tile-action>
              <v-icon>exit_to_app</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>Log out</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-menu>
    </v-toolbar>
    <v-content>
      <v-alert
        v-model="alertBox.show"
        :type="alertBox.type || 'info'"
        dismissible
        transition="slide-y-transition"
        class="alert"
      >{{ alertBox.text }}</v-alert>
      <router-view/>
    </v-content>
  </v-app>
</template>

<style>
@import "assets/css/style.css";
</style>

<script>
import firebase from "firebase";
import { MD5 } from "crypto-js";

export default {
  name: "App",
  data() {
    return {
      alertBox: {
        show: false,
        type: "info",
        text: "",
        send: (type, message, timeout) => {
          if (!timeout || isNaN(timeout) || timeout < 1) timeout = 7500;
          if (!message || message === "") message = "Unknown error";
          if (!type || !/success|info|warning|error/.test(type)) type = "info";
          this.alertBox.show = true;
          this.alertBox.type = type;
          this.alertBox.text = message;
          setTimeout(() => {
            this.alertBox.show = false;
          }, timeout);
        }
      },
      currentUser: this.$root.$children[0].currentUser || null,
      gravatarUrl: null,
      darkMode:
        localStorage.getItem("darkMode") === null
          ? true
          : localStorage.getItem("darkMode") === "true"
          ? true
          : false
    };
  },
  methods: {
    signOut: function() {
      firebase
        .auth()
        .signOut()
        .then(() => {
          this.alertBox.send("info", "Logged out", 3000);
        })
        .catch(e => {
          this.alertBox.send("error", e.message, 10000);
        });
    },
    getGravatarUrl: function(email, size) {
      size = size || 64;
      return `https://www.gravatar.com/avatar/${MD5(
        email.trim()
      ).toString()}?s=${size}`;
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      this.darkMode
        ? localStorage.setItem("darkMode", true)
        : localStorage.setItem("darkMode", false);
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      this.currentUser = user;
    });
    firebase.auth().onAuthStateChanged(user => {
      this.$root.$emit("onAuthStateChanged", user);
    });
    const mode = this.$route.query.mode;
    const actionCode = this.$route.query.oobCode;
    if (mode && actionCode) {
      const auth = firebase.auth();
      switch (mode) {
        case "resetPassword":
          auth
            .verifyPasswordResetCode(actionCode)
            .then(email => {
              this.$router.push({
                path: "/reset-password",
                query: {
                  email,
                  actionCode
                }
              });
            })
            .catch(e => {
              this.$router.replace("/");
              this.alertBox.send("error", e.message, 10000);
            });
          break;
        case "recoverEmail":
          auth
            .checkActionCode(actionCode)
            .then(() => {
              auth.applyActionCode(actionCode).then(() => {
                this.alertBox.send("success", "Email address recovered", 3000);
                if (firebase.auth().currentUser) firebase.auht().currentUser.reload();
              });
            })
            .catch(e => this.alertBox.send("error", e.message, 10000));
          this.$router.replace("/");
          break;
        case "verifyEmail":
          auth
            .applyActionCode(actionCode)
            .then(() => {
              this.$root.$emit(
                "onAuthStateChanged",
                firebase.auth().currentUser
              );
              this.alertBox.send(
                "success",
                "Email address successfully verified.",
                3000
              );
            })
            .catch(e => this.alertBox.send("error", e.message, 10000));
          this.$router.replace("/");
          break;
        default:
          this.$router.replace("/");
          this.alertBox.send("error", "Invalid mode", 10000);
          break;
      }
    }
  }
};
</script>
