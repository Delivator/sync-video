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
        <div
          v-if="publicRooms && publicRooms.length > 0 && publicRooms.length < 5"
        >
          <h4 class="headline"><v-icon>public</v-icon> Public rooms:</h4>
          <v-row justify="center">
            <template v-for="room in publicRooms">
              <v-col :key="room.id" cols="12" xl="3" lg="4" sm="6">
                <v-card :to="`/r/${room.id}`" class="text-center room-card">
                  <v-toolbar color="primary" dark>
                    <v-toolbar-title>{{ room.title }}</v-toolbar-title>
                  </v-toolbar>
                  <v-card-text>
                    <p class="center-text text--primary">
                      {{ room.usersOnline || 0 }}
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
        <div
          v-else-if="
            publicRooms && publicRooms.length > 0 && publicRooms.length > 4
          "
        >
          <v-carousel hide-delimiters height="auto">
            <v-carousel-item
              v-for="(rooms, index) in splitArray(publicRooms)"
              :key="index"
            >
              <v-row justify="center">
                <template v-for="room in rooms">
                  <v-col :key="room.id" cols="12" xl="3" lg="4" sm="6">
                    <v-card :to="`/r/${room.id}`" class="text-center room-card">
                      <v-toolbar color="primary" dark>
                        <v-toolbar-title>{{ room.title }}</v-toolbar-title>
                      </v-toolbar>
                      <v-card-text>
                        <p class="center-text text--primary">
                          {{ room.usersOnline || 0 }}
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
            </v-carousel-item>
          </v-carousel>
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
import * as fb from "../firebaseConfig";
import { isMobile } from "mobile-device-detect";

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
      showVerify: true,
      publicRooms: []
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
    },
    splitArray(arr) {
      if (arr.length < 5) {
        return arr;
      } else if (isMobile) {
        let newArr = [];
        arr.forEach((item, index) => {
          newArr[index] = [item];
        });
        console.log(newArr);
        return newArr;
      } else {
        let newArr = [];
        for (let i = 0; i < Math.ceil(arr.length / 4); i++) {
          newArr[i] = [];
          for (let index = 0; index < 4; index++) {
            let el = arr[i * 4 + index];
            if (el) newArr[i].push(el);
          }
        }
        return newArr;
      }
    }
  },
  mounted() {
    if (this.userSettings && this.userSettings.roomHistory)
      this.getRoomsStatus(this.userSettings.roomHistory.map(r => r.id));
    if (this.publicRooms) this.getRoomsStatus(this.publicRooms.map(r => r.id));
    fb.rooms
      .where("public", "==", true)
      .get()
      .then(querySnapshot => {
        this.publicRooms = [];
        querySnapshot.forEach(doc => {
          if (doc.exists) {
            this.publicRooms.push({
              id: doc.id,
              title: doc.data().title,
              usersOnline: doc.data().usersOnline || 0
            });
          }
        });
        this.publicRooms.sort((a, b) =>
          a.usersOnline < b.usersOnline ? 1 : -1
        );
        // this.publicRooms = this.publicRooms.filter((r, index) => index < 4);
        if (this.publicRooms.length > 0)
          this.getRoomsStatus(this.publicRooms.map(r => r.id));
      })
      .catch(console.error);
  }
};
</script>
