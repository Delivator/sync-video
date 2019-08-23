<template>
  <v-container class="fill-height">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-form @submit="reauthenticateAndChangeEmail">
        <v-card>
          <v-card-title>
            <span class="headline">Login</span>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="loginEmail"
              label="Email"
              :rules="[rules.required]"
            ></v-text-field>
            <v-text-field
              v-model="loginPassword"
              label="Password"
              type="password"
              :rules="[rules.required]"
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" @click="dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              @click="reauthenticateAndChangeEmail"
              type="submit"
              >Login</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="9" md="9" lg="7" xl="4">
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title class="headline"
              >Edit Your Profile</v-toolbar-title
            >
            <v-spacer></v-spacer>
            <v-tooltip left>
              <template v-slot:activator="{ on }">
                <v-avatar
                  v-if="currentUser && currentUser.email"
                  size="45"
                  v-on="on"
                  @click="openGravatar"
                  class="clickable"
                >
                  <img
                    :src="getGravatarUrl(currentUser.email, 45)"
                    alt="avatar"
                  />
                </v-avatar>
              </template>
              <span>Edit on Gravatar</span>
            </v-tooltip>
          </v-toolbar>
          <v-divider></v-divider>
          <v-card-text>
            <div v-if="currentUser">
              <v-form @submit="changeDisplayName">
                <v-text-field
                  :rules="[rules.required]"
                  v-model="displayName"
                  ref="displayName"
                  label="Username"
                  @input="checkDisplayNameInput"
                  v-if="currentUser"
                  prepend-icon="person"
                >
                  <v-icon
                    color="success"
                    slot="append"
                    v-if="displayNameChanged"
                    @click="changeDisplayName"
                    >check</v-icon
                  >
                </v-text-field>
                <input type="submit" class="hide" />
              </v-form>
              <v-form @submit="changeEmail">
                <v-text-field
                  :rules="[rules.email]"
                  v-model="email"
                  ref="email"
                  label="E-mail"
                  @input="checkEmailInput"
                  v-if="currentUser.email"
                  type="email"
                  prepend-icon="alternate_email"
                >
                  <v-icon
                    color="success"
                    slot="append"
                    v-if="emailChanged"
                    @click="changeEmail"
                    >check</v-icon
                  >
                </v-text-field>
                <input type="submit" class="hide" />
              </v-form>
            </div>
            <div v-else>
              <h6 class="title">
                You need to be logged in to edit your profile.
              </h6>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn v-if="!currentUser" to="/login" d>Login</v-btn>
            <v-spacer></v-spacer>
            <v-btn v-if="currentUser" to="/reset-password"
              >Change Password</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
@import "../assets/css/style.css";
</style>

<script>
import firebase from "firebase/app";
import "firebase/auth";
import { MD5 } from "crypto-js";

export default {
  props: ["alertBox", "currentUser"],
  data() {
    return {
      emailChanged: false,
      displayNameChanged: false,
      dialog: false,
      loginEmail:
        this.currentUser && this.currentUser.email
          ? this.currentUser.email
          : "",
      loginPassword: "",
      email:
        this.currentUser && this.currentUser.email
          ? this.currentUser.email
          : "",
      displayName:
        this.currentUser && this.currentUser.displayName
          ? this.currentUser.displayName
          : "",
      rules: {
        required: value => !!value || "Required.",
        email: value => {
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
          return pattern.test(value) || "Invalid e-mail.";
        }
      }
    };
  },
  methods: {
    reauthenticateAndChangeEmail(event) {
      if (event) event.preventDefault();
      const cred = firebase.auth.EmailAuthProvider.credential(
        this.loginEmail,
        this.loginPassword
      );
      this.currentUser
        .reauthenticateAndRetrieveDataWithCredential(cred)
        .then(() => {
          this.dialog = false;
          this.changeEmail();
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    },
    changeEmail(event) {
      if (event) event.preventDefault();
      if (
        !this.currentUser ||
        !this.email ||
        !this.$refs.email.valid ||
        !this.emailChanged
      )
        return;
      this.currentUser
        .updateEmail(this.email)
        .then(() => this.alertBox.send("success", "E-mail address changed"))
        .catch(e => {
          if (e.code === "auth/requires-recent-login") this.dialog = true;
          this.alertBox.send("error", e, 10000);
        });
    },
    changeDisplayName(event) {
      if (event) event.preventDefault();
      if (!this.currentUser || !this.displayNameChanged) return;
      if (!this.$refs.displayName.valid) {
        return this.$refs.displayName.validate(true);
      }
      this.currentUser
        .updateProfile({ displayName: this.displayName })
        .then(() => {
          this.alertBox.send("success", "Username updated", 3000);
          this.currentUser = firebase.auth().currentUser;
          this.checkDisplayNameInput();
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    },
    checkEmailInput() {
      setTimeout(() => {
        if (this.currentUser && this.currentUser.email)
          this.emailChanged =
            this.email !== this.currentUser.email && this.$refs.email.valid;
      }, 0);
    },
    checkDisplayNameInput() {
      setTimeout(() => {
        if (this.currentUser && this.currentUser.displayName)
          this.displayNameChanged =
            this.displayName !== this.currentUser.displayName &&
            this.$refs.displayName.valid;
        if (this.currentUser && !this.currentUser.displayName)
          this.displayNameChanged = this.$refs.displayName.valid;
      }, 0);
    },
    getGravatarUrl(email, size) {
      size = size || 64;
      return `https://www.gravatar.com/avatar/${MD5(
        email.trim()
      ).toString()}?s=${size}`;
    },
    openGravatar() {
      window.open("http://gravatar.com/emails/", "_blank");
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      if (user) {
        this.email = user.email;
        this.displayName = user.displayName;
        this.loginEmail = user.email;
      }
    });
  }
};
</script>
