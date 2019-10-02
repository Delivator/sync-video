<template>
  <v-app>
    <template>
      <v-row justify="center">
        <v-dialog v-model="showChangelog" width="600px">
          <v-card>
            <v-card-title>
              <span class="headline">Changelog</span>
            </v-card-title>
            <v-card-text v-html="changelog"></v-card-text>
            <v-card-actions>
              <div class="flex-grow-1"></div>
              <v-btn @click="showChangelog = false">Close</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-row>
    </template>
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
        :roomsWithStatus="roomsWithStatus"
        :getRoomsStatus="getRoomsStatus"
        :ping="ping"
        :pingColor="pingColor"
      />
    </v-content>
    <v-alert
      color="primary"
      outlined
      icon="info"
      v-model="showCookie"
      text
      max-width="500"
      class="cookieAlert"
    >
      <p>
        We serve cookies on this site to analyse traffic, remember your
        preferences, and optimise your experience. By using this site you agree
        to the Cookie Policy.
      </p>
      <v-btn outlined color="primary">More details</v-btn>
      <v-btn outlined color="primary">OK</v-btn>
    </v-alert>
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
            href=""
            @click="
              $event.preventDefault();
              showChangelog = true;
            "
            >v{{ version }}</a
          >
          &ndash;
          <span
            >{{ onlineClients }} user{{
              onlineClients > 1 ? "s" : ""
            }}
            connected</span
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
import io from "socket.io-client";
import { MD5 } from "crypto-js";
import settings from "./settings.json";
import version from "../package.json";
import showdown from "showdown";
import changelog from "!raw-loader!../CHANGELOG.md";
import * as fb from "./fb";

const mdConverter = new showdown.Converter({ openLinksInNewWindow: true });

function UserSettings(darkMode = true, roomHistory = []) {
  return {
    darkMode,
    roomHistory,
    version: version.version
  };
}

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
      currentUser: fb.currentUser,
      gravatarUrl: null,
      socket: null,
      userSettings: UserSettings(),
      skipSettingsEvent: false,
      version: version.version,
      roomsWithStatus: {},
      showChangelog: false,
      changelog: mdConverter.makeHtml(changelog),
      ping: 0,
      onlineClients: 0,
      pingColor: "grey--text",
      showCookie: false
    };
  },
  watch: {
    userSettings: {
      handler(newUserSettings) {
        if (!newUserSettings.version) newUserSettings = UserSettings();

        if (
          newUserSettings &&
          newUserSettings.roomHistory &&
          newUserSettings.roomHistory.length > 0
        ) {
          this.getRoomsStatus(newUserSettings.roomHistory);
        }
        this.$vuetify.theme.dark = newUserSettings.darkMode;
        localStorage.userSettings = JSON.stringify(newUserSettings);
        if (this.skipSettingsEvent) return (this.skipSettingsEvent = false);
        if (!this.currentUser) return;
        fb.user_settings
          .doc(this.currentUser.uid)
          .set(newUserSettings)
          .catch(console.error);
      },
      deep: true
    }
  },
  methods: {
    signOut: function() {
      fb.auth
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
    },
    getOnlineUsers: function() {
      this.socket.emit("getOnlineUsers", users => {
        if (!users) return;
        this.onlineClients = users;
      });
    }
  },
  mounted() {
    const mode = this.$route.query.mode;
    const actionCode = this.$route.query.oobCode;

    if (localStorage.userSettings) {
      this.userSettings = JSON.parse(localStorage.userSettings);
    } else {
      this.skipSettingsEvent = true;
      this.userSettings = UserSettings();
    }

    if (this.currentUser) {
      fb.user_settings.doc(this.currentUser.uid).onSnapshot(doc => {
        this.skipSettingsEvent = true;
        this.userSettings = doc.data();
      });
    }

    fb.auth.onAuthStateChanged(user => {
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

    if (!this.socket) {
      this.socket = io(settings.socketUrl);
    }

    this.socket.on("connect", () => {
      if (this.userSettings && this.userSettings.roomHistory)
        this.getRoomsStatus(this.userSettings.roomHistory.map(r => r.id));
      this.getOnlineUsers();
      this.socket.on("pong", ping => {
        this.ping = ping;
        this.getOnlineUsers();
        if (ping < 50) {
          this.pingColor = "green--text";
        } else if (ping < 100) {
          this.pingColor = "lime--text";
        } else if (ping < 150) {
          this.pingColor = "yellow--text text--darken-3";
        } else if (ping > 200) {
          this.pingColor = "orange--text text--darken-3";
        }
      });
    });

    if (mode && actionCode) {
      switch (mode) {
        case "resetPassword":
          fb.auth
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
          fb.auth
            .checkActionCode(actionCode)
            .then(() => {
              fb.auth.applyActionCode(actionCode).then(() => {
                if (fb.currentUser) fb.currentUser.reload();
                this.alertBox.send("success", "Email address recovered", 3000);
              });
            })
            .catch(e => this.alertBox.send("error", e, 10000));
          this.$router.replace("/");
          break;
        case "verifyEmail":
          fb.auth
            .applyActionCode(actionCode)
            .then(() => {
              if (fb.currentUser) fb.currentUser.reload();
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
