<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-form>
          <v-card class="elevation-12">
            <v-toolbar dark color="primary">
              <v-toolbar-title>Sign Up</v-toolbar-title>
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
                  prepend-icon="lock"
                  :append-icon="showPassword ? 'visibility_off' : 'visibility'"
                  :rules="[rules.required, rules.min]"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  hint="At least 6 characters"
                  counter
                  @click:append="showPassword = !showPassword"
                  v-model="password"
                  ref="password"
                ></v-text-field>
                <v-text-field
                  :rules="[rules.required]"
                  prepend-icon="person"
                  label="Username"
                  v-model="displayName"
                  ref="displayName"
                ></v-text-field>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-btn color="primary" to="/login"
                >Login <v-icon>keyboard_arrow_right</v-icon></v-btn
              >
              <v-spacer></v-spacer>
              <v-btn @click="signUp" color="success" type="submit"
                >Sign Up</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-form>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import * as fb from "../fb";

export default {
  props: ["alertBox"],
  data() {
    return {
      email: "",
      password: "",
      showPassword: false,
      loading: false,
      displayName: this.generateUsername(),
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
    signUp: function(event) {
      if (event) event.preventDefault();
      if (
        !this.$refs.email.valid ||
        !this.$refs.password.valid ||
        !this.$refs.displayName.valid
      ) {
        this.$refs.email.validate(true);
        this.$refs.password.validate(true);
        this.$refs.displayName.validate(true);
        return;
      }
      fb.firebase.auth
        .createUserWithEmailAndPassword(this.email, this.password)
        .then(user => {
          if (this.displayName && this.displayName !== "")
            user.user
              .updateProfile({ displayName: this.displayName })
              .catch(e => this.alertBox.send("error", e, 10000));
          this.$router.replace("/");
          this.alertBox.send(
            "success",
            `Account for ${user.user.email} created`
          );
        })
        .catch(e => {
          this.alertBox.send("error", e, 10000);
        });
    },
    generateUsername() {
      let number = Math.floor(Math.random() * 9999 + 1).toString();
      while (number.length < 4) {
        number = "0" + number;
      }
      return "User#" + number;
    }
  }
};
</script>
