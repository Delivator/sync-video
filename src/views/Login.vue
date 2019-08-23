<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-form @submit="login">
          <v-card class="elevation-12">
            <v-toolbar dark color="primary">
              <v-toolbar-title>Login</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <div v-if="loading">
                <v-progress-linear :indeterminate="true"></v-progress-linear>
              </div>
              <div v-else>
                <v-text-field
                  :rules="[rules.required, rules.email]"
                  prepend-icon="alternate_email"
                  label="Email"
                  type="email"
                  v-model="email"
                  ref="email"
                ></v-text-field>
                <v-text-field
                  :rules="[rules.required, rules.min]"
                  prepend-icon="lock"
                  :append-icon="showPassword ? 'visibility_off' : 'visibility'"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  hint="At least 6 characters"
                  counter
                  @click:append="showPassword = !showPassword"
                  v-model="password"
                  ref="password"
                ></v-text-field>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" to="/sign-up">
                <v-icon>keyboard_arrow_left</v-icon>Sign Up
              </v-btn>
              <v-spacer></v-spacer>
              <v-btn @click="resetPassword" color="error">Reset Password</v-btn>
              <v-btn @click="login" color="success" type="submit">Login</v-btn>
            </v-card-actions>
          </v-card>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import firebase from "firebase/app";
import "firebase/auth";

export default {
  props: ["alertBox"],
  data() {
    return {
      email: "",
      password: "",
      showPassword: false,
      loading: false,
      rules: {
        required: value => !!value || "Required.",
        min: value => value.length >= 6 || "Min 6 characters",
        email: value => {
          const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
          return pattern.test(value) || "Invalid e-mail.";
        }
      }
    };
  },
  methods: {
    login: function(event) {
      if (event) event.preventDefault();
      if (!this.$refs.email.valid) {
        this.$refs.email.validate(true);
        return;
      }
      this.loading = true;
      firebase
        .auth()
        .signInWithEmailAndPassword(this.email, this.password)
        .then(() => {
          this.loading = false;
          this.$router.replace("/");
          this.alertBox.send("success", "Logged in", 3000);
        })
        .catch(e => {
          this.loading = false;
          this.alertBox.send("error", e, 10000);
        });
    },
    resetPassword: function() {
      if (!this.$refs.email.valid) {
        this.$refs.email.validate(true);
        return;
      }
      this.loading = true;
      firebase
        .auth()
        .sendPasswordResetEmail(this.email)
        .then(() => {
          this.loading = false;
          this.$router.push("/");
          this.alertBox.send("success", "Password reset mail send");
        })
        .catch(e => {
          this.loading = false;
          this.alertBox.send("error", e, 10000);
        });
    }
  }
};
</script>
