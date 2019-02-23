<template>
  <v-container>
    <v-dialog v-model="dialog" max-width="600px">
      <v-form @submit="updateRoom">
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Update room</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-text-field
              v-model="title"
              label="Title"
              :rules="[rules.required, rules.title]"
              counter
              maxlength="64"
              ref="title"
            ></v-text-field>
            <v-checkbox v-model="isPublic" label="Public"></v-checkbox>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" outline @click="dialog = false">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="error" @click="dialog = false; dialog2 = true">Delete</v-btn>
            <v-btn color="success" @click="updateRoom" type="submit">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <v-dialog v-model="dialog2" persistent max-width="600px">
      <v-form>
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Delete room</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <h6 class="title font-weight-light">
              Are you sure you want the delete
              <span class="font-weight-bold">{{roomData.title}}</span>?
            </h6>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" outline @click="dialog2 = false; dialog = true">Cancel</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="error" @click="deleteRoom" type="submit">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
    <v-layout text-xs-center justify-center align-center>
      <v-flex v-if="roomData" xs8>
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>{{this.roomData.title}}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              icon
              @click="dialog = true"
              v-if="currentUser && roomData.owner === currentUser.uid"
            >
              <v-icon>settings</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-responsive :aspect-ratio="16/9">
              <youtube :video-id="videoId" ref="youtube" width="100%" height="100%"></youtube>
            </v-responsive>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-flex v-else xs8>
        <h1 class="display-4 font-weight-bold">404</h1>
        <h5 class="headline font-weight-light">Room not found. Create one here:</h5>
        <v-btn to="/rooms">My rooms</v-btn>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import firebase from "firebase";

export default {
  data() {
    return {
      currentUser: this.$root.$children[0].currentUser,
      roomID: this.$route.params.id || null,
      db: null,
      roomData: null,
      dialog: false,
      dialog2: false,
      title: "",
      isPublic: false,
      videoId: "3XS6azLKsNY",
      dbListener: null,
      rules: {
        required: value => !!value || "Required.",
        title: value => 1 < value.length < 65 || "1-64 Characters"
      }
    };
  },
  computed: {
    hintText() {
      return `Room url will be ${location.host}/r/${this.path}`;
    },
    player() {
      return this.$refs.youtube.player;
    }
  },
  methods: {
    updateRoom(event) {
      const alertBox = this.$root.$children[0].alertBox;
      if (event) event.preventDefault();
      if (!this.$refs.title.valid) return this.$refs.title.validate(true);
      if (!this.currentUser || !this.db) return;
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .update({
          title: this.title,
          public: this.isPublic
        })
        .then(() => {
          alertBox.send("success", "Room updated", 3000);
          this.$router.push(`/r/${this.path}`);
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    },
    deleteRoom(event) {
      if (event) event.preventDefault();
      const alertBox = this.$root.$children[0].alertBox;
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .delete()
        .then(() => {
          alertBox.send("success", "Room deleted");
          this.$router.replace("/");
        })
        .catch(e => alertBox.send("error", e.message, 10000));
      return;
    },
    playVideo() {
      this.player.playVideo();
    }
  },
  mounted() {
    const alertBox = this.$root.$children[0].alertBox;
    this.$root.$on("onAuthStateChanged", user => {
      this.currentUser = user;
    });
    this.db = firebase.firestore();
    this.db
      .collection("rooms")
      .doc(this.roomID)
      .get()
      .then(querySnapshot => {
        if (!querySnapshot.empty) {
          this.roomData = querySnapshot.data();
          this.title = this.roomData.title;
          this.path = querySnapshot.id;
          this.isPublic = this.roomData.public;
        }
      })
      .catch(e => alertBox.send("error", e.message, 10000));
    this.db
      .collection("rooms")
      .doc(this.roomID)
      .onSnapshot(documentSnapshot => {
        this.roomData = documentSnapshot.data();
      });
  }
};
</script>
