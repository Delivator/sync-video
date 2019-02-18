<template>
  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Sign Up</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form>
              <v-text-field
                :rules="[rules.required, rules.email]"
                prepend-icon="alternate_email"
                label="Email"
                type="email"
                v-model="email"
              ></v-text-field>
              <v-text-field
                prepend-icon="lock"
                :append-icon="showPassword ? 'visibility_off' : 'visibility'"
                :rules="[rules.required, rules.min]"
                :type="showPassword ? 'text' : 'password'"
                label="Password"
                hint="At least 6 characters"
                counter
                @click:append="showPassword = !showPassword"
                v-model="password"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/login">Login</v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="signUp" color="success">Sign Up</v-btn>
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
    signUp: function() {
      const alertBox = this.$root.$children[0].alertBox;
      firebase
        .auth()
        .createUserWithEmailAndPassword(this.email, this.password)
        .then(user => {
          alertBox.send(
            "success",
            `Account for ${user.user.email} created succesfully!`
          );
          this.$router.replace("/");
          this.$root.$emit("onAuthStateChanged", user.user);
        })
        .catch(e => {
          alertBox.send("error", e.message || "Unknown error", 10000);
        });
    }
  }
};
</script>