<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title class="headline text-uppercase">
        <router-link to="/" :class="userSettings.darkMode ? 'white--text' : 'black--text'">
          <span>SYNC-VIDEO</span>
          <span class="font-weight-light">.ME</span>
        </router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!currentUser" raised to="/login">
        <span>Login</span>
      </v-btn>
      <v-menu offset-y>
        <v-avatar v-if="currentUser && currentUser.email" v-slot:activator="{ on }">
          <img :src="getGravatarUrl(currentUser.email)" alt="avatar">
        </v-avatar>
        <v-btn v-else fab small v-slot:activator="{ on }">
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
          <v-list-tile @click="userSettings.darkMode = !userSettings.darkMode">
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
    </v-app-bar>
    <v-content>
      <div class="alert">
        <v-alert
          v-for="alert in alerts"
          :key="alert.id"
          v-model="alert.show"
          :type="alert.type"
          dismissible
          transition="slide-y-transition"
        >{{ alert.text }}</v-alert>
      </div>
      <router-view
        :alertBox="alertBox"
        :currentUser="currentUser"
        :socket="socket"
        :userSettings="userSettings"
        :db="db"
      />
    </v-content>
    <v-footer height="auto">
      <v-layout row wrap justify-center>
        <v-flex xs12 py-3 text-center>
          Made with 💚 by
          <a
            :class="userSettings.darkMode ? 'white--text' : 'black--text'"
            href="https://github.com/Delivator"
            target="_blank"
            rel="noopener noreferrer"
          >Delivator</a>
          &ndash;
          <a
            :class="userSettings.darkMode ? 'white--text' : 'black--text'"
            href="https://github.com/Delivator/sync-video"
            target="_blank"
            rel="noopener noreferrer"
          >Source code</a>
        </v-flex>
      </v-layout>
    </v-footer>
  </v-app>
</template>

<style>
@import "assets/css/style.css";
</style>

<script>
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import io from "socket.io-client";
import { MD5 } from "crypto-js";
import settings from "./settings.json";

export default {
  name: "App",
  data() {
    return {
      alerts: [],
      alertBox: {
        show: false,
        type: "info",
        text: "",
        send: (type, message, timeout) => {
          if (!timeout || isNaN(timeout) || timeout < 1) timeout = 7500;
          if (!message || message === "") message = "Unknown error";
          if (!type || !/success|info|warning|error/.test(type)) type = "info";
          if (type === "error") {
            if (message instanceof Error) {
              console.error(message);
              message = message.message;
            }
          }

          let id = MD5(Math.random().toString()).toString();

          this.alerts.push({
            id,
            show: true,
            type,
            text: message,
            timeout: setTimeout(() => {
              this.alerts.filter(alert => alert.id === id)[0].show = false;
            }, timeout)
          });
        }
      },
      currentUser: null,
      gravatarUrl: null,
      socket: null,
      userSettings: {
        darkMode: true,
        roomHistory: []
      },
      db: null,
      skipSettingsEvent: false
    };
  },
  watch: {
    userSettings: {
      handler(newUserSettings) {
        if (this.skipSettingsEvent) return this.skipSettingsEvent = false;
        localStorage.userSettings = JSON.stringify(newUserSettings);
        if (!this.db || !this.currentUser) return;
        this.db
          .collection("user_settings")
          .doc(this.currentUser.uid)
          .set(newUserSettings)
          .catch(console.error);
      },
      deep: true
    }
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
          this.alertBox.send("error", e, 10000);
        });
    },
    getGravatarUrl: function(email, size) {
      size = size || 64;
      return `https://www.gravatar.com/avatar/${MD5(
        email.trim()
      ).toString()}?s=${size}`;
    }
  },
  mounted() {
    const mode = this.$route.query.mode;
    const actionCode = this.$route.query.oobCode;

    if (!this.db) this.db = firebase.firestore();

    if (localStorage.userSettings) {
      this.userSettings = JSON.parse(localStorage.userSettings);
    } else {
      if (this.db && this.currentUser) {
        this.db
          .collection("user_settings")
          .doc(this.currentUser.uid)
          .get()
          .then(doc => {
            if (doc.exists) {
              this.userSettings = doc.data();
            } else {
              this.userSettings = {
                darkMode: true,
                roomHistory: []
              };
            }
          })
          .catch(error => {
            console.error(error);
            this.userSettings = {
              darkMode: true,
              roomHistory: []
            };
          });
      } else {
        this.userSettings = {
          darkMode: true,
          roomHistory: []
        };
      }
    }

    setTimeout(() => {
      if (this.db && this.currentUser) {
        this.db
          .collection("user_settings")
          .doc(this.currentUser.uid)
          .onSnapshot(doc => {
            this.skipSettingsEvent = true;
            this.userSettings = doc.data();
          });
      }
    }, 1000);

    firebase.auth().onAuthStateChanged(user => {
      this.currentUser = user;
      this.$root.$emit("onAuthStateChanged", user);
      if (user && this.socket && this.socket.connected) {
        user
          .getIdToken()
          .then(token => {
            this.socket.emit("authenticate", token);
          })
          .catch(e => this.alertBox.send("error", e, 10000));
      }
    });

    if (!this.socket && this.currentUser) {
      if (this.socket && this.socket.disconnected) return this.socket.open();
      this.currentUser
        .getIdToken()
        .then(token => {
          this.socket = io(settings.socketUrl, {
            query: {
              token
            }
          });
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    } else {
      this.socket = io(settings.socketUrl);
    }

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
              this.alertBox.send("error", e, 10000);
            });
          break;
        case "recoverEmail":
          auth
            .checkActionCode(actionCode)
            .then(() => {
              auth.applyActionCode(actionCode).then(() => {
                if (firebase.auth().currentUser)
                  firebase.auht().currentUser.reload();
                this.alertBox.send("success", "Email address recovered", 3000);
              });
            })
            .catch(e => this.alertBox.send("error", e, 10000));
          this.$router.replace("/");
          break;
        case "verifyEmail":
          auth
            .applyActionCode(actionCode)
            .then(() => {
              if (firebase.auth().currentUser)
                firebase.auth().currentUser.reload();
              this.alertBox.send("success", "Email address verified", 5000);
            })
            .catch(e => this.alertBox.send("error", e, 10000));
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
