<template>
  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Change Password</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form>
              <h6 class="title" v-if="email">
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
                v-if="this.email || this.actionCode || this.currentUser"
              ></v-text-field>
              <h6
                class="title"
                v-if="!(this.email || this.actionCode || this.currentUser)"
              >You need to be logged in to change yor password.</h6>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn
              to="/"
              outline
              v-if="!(this.email || this.actionCode || this.currentUser)"
            >Go Back</v-btn>
            <v-spacer></v-spacer>
            <v-btn
              @click="confirm"
              color="success"
              v-if="this.email || this.actionCode || this.currentUser"
            >Confirm</v-btn>
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
      email: null,
      actionCode: null,
      currentUser: this.$root.$children[0].currentUser,
      rules: {
        required: value => !!value || "Required.",
        min: value => value.length >= 6 || "Min 6 characters"
      }
    };
  },
  methods: {
    confirm: function() {
      const alertBox = this.$root.$children[0].alertBox;
      if (!this.$refs["password"].valid) {
        this.$refs["password"].validate(true);
        return;
      }
      firebase
        .auth()
        .confirmPasswordReset(this.actionCode, this.password)
        .then(() => {
          alertBox.send(
            "success",
            "Password changed successfully. You can now log in wiht your new password."
          );
          this.$router.replace("/login");
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      this.currentUser = user;
    });
    const email = this.$route.query.email;
    const actionCode = this.$route.query.actionCode;
    this.email = email;
    this.actionCode = actionCode;
  }
};
</script>