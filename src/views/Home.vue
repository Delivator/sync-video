<template>
  <v-container>
    <v-layout text-center wrap>
      <v-flex xs12>
        <v-img
          :src="require('../assets/logo.svg')"
          class="my-3"
          contain
          height="150"
        ></v-img>
      </v-flex>

      <v-flex xs12 offset-xs0 md8 offset-md2>
        <h1 class="display-2 font-weight-bold mb-3" v-if="currentUser">
          Welcome back,
          <span class="font-weight-light">{{
            currentUser.displayName || currentUser.email || "Guest"
          }}</span
          >.
        </h1>
        <h1 class="display-2 font-weight-bold mb-3" v-else>
          Welcome to Sync Video!
        </h1>
        <v-divider
          class="divider-margin"
          v-if="userSettings.roomHistory && userSettings.roomHistory.length > 0"
        ></v-divider>
        <div
          v-if="userSettings.roomHistory && userSettings.roomHistory.length > 0"
        >
          <h4 class="display-1">Recent rooms:</h4>
          <template v-for="room in userSettings.roomHistory">
            <v-btn :key="room.id" :to="`/r/${room.id}`">{{ room.title }}</v-btn>
          </template>
        </div>
        <p
          class="subheading font-weight-regular"
          v-if="
            showVerify &&
              currentUser &&
              currentUser.email &&
              !currentUser.emailVerified
          "
        >
          Your email address has not yet been confirmed. Click here to send a
          verification email.
          <br />
          <v-btn outline @click="verifyEmail">Verify email</v-btn>
        </p>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  props: ["alertBox", "currentUser", "userSettings"],
  data() {
    return {
      showVerify: true
    };
  },
  methods: {
    verifyEmail: function() {
      if (
        this.currentUser &&
        this.currentUser.email &&
        !this.currentUser.emailVerified
      ) {
        this.currentUser
          .sendEmailVerification()
          .then(() => {
            this.alertBox.send("success", "Verification email send");
            this.showVerify = false;
          })
          .catch(e => this.alertBox.send("error", e, 10000));
      }
    }
  }
};
</script>
