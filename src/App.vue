<template>
  <v-app>
    <v-app-bar app>
      <v-toolbar-title class="headline text-uppercase">
        <router-link
          to="/"
          :class="userSettings.darkMode ? 'white--text' : 'black--text'"
        >
          <span>SYNC-VIDEO</span>
          <span class="font-weight-light">.ME</span>
        </router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!currentUser" raised to="/login">
        <span>Login</span>
      </v-btn>
      <v-menu offset-y v-if="currentUser">
        <template v-slot:activator="{ on }">
          <v-avatar
            v-show="currentUser && currentUser.email"
            v-on="on"
            class="clickable"
          >
            <img :src="getGravatarUrl(currentUser.email)" alt="avatar" />
          </v-avatar>
          <v-btn v-show="currentUser && !currentUser.email" small fab v-on="on">
            <v-icon>settings</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item to="/profile" v-if="currentUser">
            <v-list-item-action>
              <v-icon>person</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Profile</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item to="/rooms" v-if="currentUser">
            <v-list-item-action>
              <v-icon>menu</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Rooms</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="userSettings.darkMode = !userSettings.darkMode">
            <v-list-item-action>
              <v-icon>invert_colors</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Toggle dark mode</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
          <v-divider v-if="currentUser"></v-divider>
          <v-list-item @click="signOut" v-if="currentUser">
            <v-list-item-action>
              <v-icon>exit_to_app</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Log out</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
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
          >{{ alert.text }}</v-alert
        >
      </div>
      <router-view
        :alertBox="alertBox"
        :currentUser="currentUser"
        :socket="socket"
        :userSettings="userSettings"
        :db="db"
        :roomsWithStatus="roomsWithStatus"
        :getRoomsStatus="getRoomsStatus"
      />
    </v-content>
    <v-footer height="auto">
      <v-row justify="center">
        <v-col class="py-3 text-center" cols="12">
          Made with 💚 by
          <a
            :class="userSettings.darkMode ? 'white--text' : 'black--text'"
            href="https://github.com/Delivator"
            target="_blank"
            rel="noopener noreferrer"
            >Delivator</a
          >
          &ndash;
          <a
            :class="userSettings.darkMode ? 'white--text' : 'black--text'"
            href="https://github.com/Delivator/sync-video"
            target="_blank"
            rel="noopener noreferrer"
            >Source code</a
          >
          &ndash;
          <a
            class="version-tag"
            :class="userSettings.darkMode ? 'white--text' : 'black--text'"
            href="https://github.com/Delivator/sync-video/commits/master"
            target="_blank"
            rel="noopener noreferrer"
            >v{{ version }}</a
          >
        </v-col>
      </v-row>
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
import version from "../package.json";

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
      skipSettingsEvent: false,
      version: version.version,
      roomsWithStatus: {}
    };
  },
  watch: {
    userSettings: {
      handler(newUserSettings) {
        if (
          newUserSettings &&
          newUserSettings.roomHistory &&
          newUserSettings.roomHistory.length > 0
        ) {
          let rooms = newUserSettings.roomHistory.map(r => r.id);
          this.getRoomsStatus(rooms);
        }
        this.$vuetify.theme.dark = newUserSettings.darkMode;
        if (this.skipSettingsEvent) return (this.skipSettingsEvent = false);
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
    },
    getRoomsStatus: function(rooms) {
      if (!rooms || rooms.length < 1 || !this.socket || !this.socket.connected)
        return;
      this.socket.emit("getRoomStatus", rooms, roomsWithStatus => {
        if (roomsWithStatus)
          this.roomsWithStatus = {
            ...this.roomsWithStatus,
            ...roomsWithStatus
          };
      });
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
    } else if (!this.socket) {
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
