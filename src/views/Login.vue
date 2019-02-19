<template>
  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form>
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
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/sign-up">Sign Up</v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="resetPassword" color="error">Reset Password</v-btn>
            <v-btn @click="login" color="success">Login</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import firebase from "firebase";

export default {
  data() {
    return {
      showPassword: false,
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
    login: function() {
      const alertBox = this.$root.$children[0].alertBox;
      if (!this.$refs["email"].valid) {
        this.$refs["email"].validate(true);
        return;
      }
      firebase
        .auth()
        .signInWithEmailAndPassword(this.email, this.password)
        .then(() => {
          alertBox.send("success", "Successfully logged in!", 3000);
          this.$router.replace("/");
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    },
    resetPassword: function() {
      const alertBox = this.$root.$children[0].alertBox;
      if (!this.$refs["email"].valid) {
        this.$refs["email"].validate(true);
        return;
      }
      firebase
        .auth()
        .sendPasswordResetEmail(this.email)
        .then(() => {
          this.$router.push("/");
          alertBox.send("success", "Password reset mail send.");
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    }
  }
};
</script>