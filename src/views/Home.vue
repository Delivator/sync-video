<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-img
          :src="require('../assets/logo.svg')"
          class="my-3"
          contain
          height="150"
        ></v-img>
      </v-col>

      <v-col class="text-center" cols="12" offset="0" md="8" offset-md="2">
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
      </v-col>
      <v-col cols="12" offset="0" md="8" offset-md="2">
        <div
          v-if="userSettings.roomHistory && userSettings.roomHistory.length > 0"
        >
          <h4 class="headline"><v-icon>history</v-icon> Recent rooms:</h4>
          <v-row justify="center">
            <template v-for="room in userSettings.roomHistory">
              <v-col :key="room.id" cols="12" xl="3" lg="4" sm="6">
                <v-card :to="`/r/${room.id}`" class="text-center room-card">
                  <v-toolbar color="primary" dark>
                    <v-toolbar-title>{{ room.title }}</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn
                      color="error"
                      fab
                      small
                      class="room-card-close-btn"
                      @click="removeFromHistory(room.id, $event)"
                      ><v-icon>close</v-icon></v-btn
                    >
                  </v-toolbar>
                  <v-card-text>
                    <p class="center-text text--primary">
                      {{
                        roomsWithStatus[room.id]
                          ? roomsWithStatus[room.id].usersOnline
                          : 0
                      }}
                      <v-icon>person</v-icon>
                      {{
                        roomsWithStatus[room.id]
                          ? roomsWithStatus[room.id].queueLengh
                          : 0
                      }}
                      <v-icon>list</v-icon>
                    </p>
                    <p>
                      Now Playing:
                      <strong>
                        {{
                          roomsWithStatus[room.id] &&
                          roomsWithStatus[room.id].nowPlaying
                            ? roomsWithStatus[room.id].nowPlaying
                            : "-/-"
                        }}</strong
                      >
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
            </template>
          </v-row>
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
          <v-btn outlined @click="verifyEmail">Verify email</v-btn>
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  props: [
    "alertBox",
    "currentUser",
    "userSettings",
    "roomsWithStatus",
    "getRoomsStatus"
  ],
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
    },
    removeFromHistory: function(roomID, event) {
      if (event) event.preventDefault();
      let roomHistory = [];
      // remove current room from history
      roomHistory = this.userSettings.roomHistory;
      roomHistory = roomHistory.filter(room => room.id !== roomID);
      this.userSettings.roomHistory = roomHistory;
    }
  },
  mounted() {
    if (this.userSettings && this.userSettings.roomHistory)
      this.getRoomsStatus(this.userSettings.roomHistory.map(r => r.id));
  }
};
</script>
