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
      <v-hover>
        <v-img
          v-if="currentUser && currentUser.email"
          :src="getGravatarUrl(currentUser.email)"
          max-width="3em"
          @click="openGravatar"
          slot-scope="{ hover }"
          :class="`avatar elevation-${hover ? 5 : 2}`"
        ></v-img>
      </v-hover>
      <v-btn v-if="currentUser" raised @click="signOut">
        <span class="mr-2">Log out</span>
        <v-icon>exit_to_app</v-icon>
      </v-btn>
      <v-btn v-else raised to="/login">
        <span class="mr-2">Login</span>
        <v-icon>input</v-icon>
      </v-btn>
      <v-btn fab small @click="darkMode = !darkMode">
        <v-icon>invert_colors</v-icon>
      </v-btn>
    </v-toolbar>

    <v-content>
      <v-alert
        v-model="alertBox.show"
        :type="alertBox.type || 'info'"
        dismissible
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
          if (!message || message === "") message = "Unknown error"
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
      darkMode: true
    };
  },
  methods: {
    signOut: function() {
      firebase
        .auth()
        .signOut()
        .then(() => {
          this.alertBox.send("info", "Successfully logged out!", 3000)
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
    openGravatar: function() {
      window.open("http://gravatar.com/emails/", "_blank");
    }
  },
  mounted() {
    firebase.auth().onAuthStateChanged(user => {
      this.currentUser = user;
      this.$root.$emit("onAuthStateChanged", user);
    });
    const mode = this.$route.query.mode;
    const actionCode = this.$route.query.oobCode;
    if (mode && actionCode) {
      const auth = firebase.auth();
      switch (mode) {
        case "resetPassword":
          auth.verifyPasswordResetCode(actionCode)
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
          auth.checkActionCode(actionCode)
            .then(() => {
              auth.applyActionCode(actionCode)
                .then(() => this.alertBox.send("success", "Email address successfully changed.", 3000));
            })
            .catch(e => this.alertBox.send("error", e.message, 10000));
          this.$router.replace("/");
          break;
        case "verifyEmail":
          auth.applyActionCode(actionCode)
            .then(() => this.alertBox.send("success", "Email address successfully verified.", 3000))
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
