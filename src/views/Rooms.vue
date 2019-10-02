<template>
  <v-container class="fill-height">
    <v-dialog v-model="dialog" max-width="600px">
      <v-form @submit="addRoom">
        <v-card>
          <v-card-title>
            <span class="headline">Add room</span>
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="title"
              label="Title"
              :rules="[rules.required, rules.title]"
              counter
              maxlength="64"
              ref="title"
            ></v-text-field>
            <v-text-field
              v-model="path"
              label="URL"
              :rules="[rules.required, rules.path]"
              :hint="hintText"
              persistent-hint
              counter
              maxlength="32"
              ref="path"
            ></v-text-field>
            <v-checkbox v-model="isPublic" label="Public"></v-checkbox>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" @click="dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="addRoom" type="submit">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <v-row class="text-center" v-if="loading" align="center" justify="center">
      <v-col cols="12">
        <v-progress-circular
          :size="50"
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-col>
    </v-row>
    <v-row class="text-center" v-else justify="center">
      <v-col cols="12" md="8">
        <div v-if="currentUser">
          <div v-if="rooms">
            <h2 class="display-3">Your rooms:</h2>
            <v-row justify="center">
              <template v-for="room in rooms">
                <v-col :key="room.id" cols="12" xl="3" lg="4" sm="6">
                  <v-card :to="`/r/${room.id}`">
                    <v-toolbar color="primary" dark>
                      <v-toolbar-title>{{ room.data().title }}</v-toolbar-title>
                    </v-toolbar>
                    <v-card-text>
                      <p class="center-text">
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
            <v-divider class="divider-margin"></v-divider>
          </div>
          <div v-else>
            <h4 class="display-1">
              You don't have any rooms yet, click here to create one.
            </h4>
          </div>
          <v-btn color="success" @click="dialog = true">Add Room</v-btn>
        </div>
        <div v-else>
          <v-row>
            <v-col cols="12">
              <h4 class="display-1">
                You have to be logged in to create rooms.
              </h4>
            </v-col>
            <v-col cols="12">
              <v-btn to="/login" outlined>Login</v-btn>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
@import "../assets/css/style.css";
</style>

<script>
import { setTimeout } from "timers";
import * as fb from "../fb";

export default {
  props: ["alertBox", "currentUser", "roomsWithStatus", "getRoomsStatus"],
  data() {
    return {
      rooms: null,
      dialog: null,
      title: "",
      path: "",
      isPublic: false,
      loading: true,
      rules: {
        required: value => !!value || "Required.",
        title: value => 1 < value.length < 65 || "1-64 Characters",
        path: value => {
          const pattern = /^[a-zA-Z0-9]{1,32}$/;
          return pattern.test(value) || "1-32 characters, a-Z 0-9";
        }
      }
    };
  },
  methods: {
    getRooms() {
      if (!this.currentUser) return;
      fb.rooms
        .where("owner", "==", this.currentUser.uid)
        .get()
        .then(querySnapshot => {
          if (!querySnapshot.empty) {
            this.rooms = querySnapshot.docs;
            this.getRoomsStatus(querySnapshot.docs.map(r => r.id));
          }
          this.loading = false;
          return querySnapshot.docs;
        })
        .catch(e => {
          this.alertBox.send("error", e, 10000);
          this.loading = false;
        });
    },
    addRoom(event) {
      if (event) event.preventDefault();
      if (!this.$refs.title.valid || !this.$refs.path.valid) {
        this.$refs.title.validate(true);
        this.$refs.path.validate(true);
        return;
      }
      if (!this.currentUser) return;
      fb.rooms
        .doc(this.path)
        .set({
          owner: this.currentUser.uid,
          title: this.title,
          public: this.isPublic,
          usersOnline: 0
        })
        .then(() => {
          this.alertBox.send("success", "Room created", 3000);
          this.$router.push(`/r/${this.path}`);
        })
        .catch(e => this.alertBox.send("error", e, 10000));
    },
    generateRoomPath(input) {
      if (!input || !typeof input === "string" || input.length < 1) return "";
      let path = "";
      const pattern = /^[a-zA-Z0-9]{1,32}$/;
      for (const c of input) {
        if (pattern.test(c)) path += c;
      }
      return path;
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      if (user.displayName) this.title = `${user.displayName}'s Room`;
      if (user.displayName) this.path = this.generateRoomPath(user.displayName);
      setTimeout(() => this.getRooms(), 0);
    });
    if (this.currentUser) {
      this.getRooms();
      if (this.currentUser.displayName) {
        this.title = `${this.currentUser.displayName}'s Room`;
        this.path = this.generateRoomPath(this.currentUser.displayName);
      }
      fb.rooms
        .where("owner", "==", this.currentUser.uid)
        .onSnapshot(documentSnapshot => {
          if (!documentSnapshot.empty) this.rooms = documentSnapshot.docs;
          this.loading = false;
        });
    } else {
      this.loading = false;
    }
  },
  computed: {
    hintText() {
      return `Room url will be ${location.host}/r/${this.path}`;
    }
  }
};
</script>
