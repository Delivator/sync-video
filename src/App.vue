<template>
  <v-app dark>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <router-link to="/" class="white--text">
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
          if (!timeout || !/success|info|warning|error/.test(type))
            type = "info";
          this.alertBox.show = true;
          this.alertBox.type = type;
          this.alertBox.text = message;
          setTimeout(() => {
            this.alertBox.show = false;
          }, timeout);
        }
      },
      currentUser: this.$root.$children[0].currentUser || null,
      gravatarUrl: null
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
          this.alertBox.send("error", e.message || "Unknown error", 10000);
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
  }
};
</script>
