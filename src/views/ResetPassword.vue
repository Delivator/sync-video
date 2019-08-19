<template>
  <v-container fluid fill-height>
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-form @submit="reauthenticateAndChangePassword">
        <v-card>
          <v-card-title>
            <span class="headline">Login</span>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="loginEmail"
              label="Email*"
              :rules="[rules.required]"
              ref="loginEmail"
            ></v-text-field>
            <v-text-field
              v-model="loginPassword"
              label="Password*"
              type="password"
              :rules="[rules.required]"
              ref="loginPassword"
            ></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" @click="dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              @click="reauthenticateAndChangePassword"
              type="submit"
              >Login</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-form>
          <v-card class="elevation-12">
            <v-toolbar dark color="primary">
              <v-toolbar-title>{{
                email && actionCode ? "Reset Password" : "Change Password"
              }}</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-form @submit="submit">
                <h6 class="title" v-if="email && actionCode">
                  Reset password for
                  <span class="font-weight-light">{{ email }}</span>
                </h6>
                <v-text-field
                  :rules="[rules.required, rules.min]"
                  prepend-icon="lock"
                  :append-icon="showPassword ? 'visibility_off' : 'visibility'"
                  :type="showPassword ? 'text' : 'password'"
                  label="New Password"
                  hint="At least 6 characters"
                  counter
                  @click:append="showPassword = !showPassword"
                  v-model="password"
                  ref="password"
                  v-if="(email && actionCode) || currentUser"
                ></v-text-field>
                <h6
                  class="title"
                  v-if="!((email && actionCode) || currentUser)"
                >
                  You need to be logged in to change your password.
                </h6>
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-btn
                to="/"
                outline
                v-if="!((email && actionCode) || currentUser)"
                >Go Back</v-btn
              >
              <v-spacer></v-spacer>
              <v-btn
                @click="confirm"
                color="success"
                v-if="email && actionCode"
                type="submit"
                >Confirm</v-btn
              >
              <v-btn
                @click="changePassword"
                color="success"
                v-if="currentUser && !(email || actionCode)"
                type="submit"
                >Change</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-form>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import firebase from "firebase/app";
import "firebase/auth";

export default {
  props: ["alertBox", "currentUser"],
  data() {
    return {
      loginEmail:
        this.currentUser && this.currentUser.email
          ? this.currentUser.email
          : "",
      loginPassword: "",
      password: "",
      showPassword: false,
      email: null,
      actionCode: null,
      dialog: false,
      rules: {
        required: value => !!value || "Required.",
        min: value => value.length >= 6 || "Min 6 characters"
      }
    };
  },
  methods: {
    submit(event) {
      if (event) event.preventDefault();
      if (this.email && this.actionCode) return this.confirm();
      if (this.currentUser) return this.changePassword();
    },
    reauthenticateAndChangePassword(event) {
      if (event) event.preventDefault();
      if (!this.$refs.loginEmail.valid || !this.$refs.loginPassword.valid) {
        this.$refs.loginEmail.validate(true);
        this.$refs.loginPassword.validate(true);
        return;
      }
      firebase
        .auth()
        .EmailAuthProvider(this.loginEmail, this.loginPassword)
        .then(cred => {
          this.currentUser
            .reauthenticateAndRetrieveDataWithCredential(cred)
            .then(() => this.changePassword())
            .catch(e => this.alertBox.send("error", e, 10000));
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    },
    confirm(event) {
      if (event) event.preventDefault();
      if (!this.$refs.password.valid) {
        this.$refs.password.validate(true);
        return;
      }
      firebase
        .auth()
        .confirmPasswordReset(this.actionCode, this.password)
        .then(() => {
          this.alertBox.send(
            "success",
            "Password changed. You can now log in wiht your new password."
          );
          this.$router.replace("/login");
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    },
    changePassword(event) {
      if (event) event.preventDefault();
      if (!this.$refs.password.valid) {
        this.$refs.password.validate(true);
        return;
      }
      this.currentUser
        .updatePassword(this.password)
        .then(() => this.alertBox.send("success", "Password changed"))
        .catch(e => {
          if (e.code === "auth/requires-recent-login") this.dialog = true;
          this.alertBox.send("error", e, 10000);
        });
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      if (user && user.email) this.loginEmail = user.email;
    });
    this.email = this.$route.query.email;
    this.actionCode = this.$route.query.actionCode;
  }
};
</script>
