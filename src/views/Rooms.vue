<template>
  <v-container>
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
    <v-layout justify-center text-xs-center>
      <v-flex xs12 md8>
        <div v-if="currentUser">
          <div v-if="rooms">
            <h2 class="display-3">Your rooms:</h2>
            <template v-for="room in rooms">
              <v-btn :key="room.id" :to="`/r/${room.id}`">{{room.data().title}}</v-btn>
            </template>
            <v-divider></v-divider>
          </div>
          <div v-else>
            <h4 class="display-1">You don't have any rooms yet, click here to create one.</h4>
          </div>
          <v-btn color="success" @click="dialog = true">Add Room</v-btn>
        </div>
        <div v-else>
          <h4 class="display-1">You have to be logged in to create rooms.</h4>
          <v-btn to="/" outline>Go back</v-btn>
        </div>
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
      db: null,
      rooms: this.getRooms(),
      dialog: null,
      title: "",
      path: "",
      dbListener: null,
      isPublic: false,
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
      const alertBox = this.$root.$children[0].alertBox;
      if (!this.currentUser) return;
      this.db
        .collection("rooms")
        .where("owner", "==", this.currentUser.uid)
        .get()
        .then(querySnapshot => {
          if (!querySnapshot.empty) this.rooms = querySnapshot.docs;
          return querySnapshot.docs;
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    },
    addRoom(event) {
      const alertBox = this.$root.$children[0].alertBox;
      if (event) event.preventDefault();
      if (!this.$refs.title.valid || !this.$refs.path.valid) {
        this.$refs.title.validate(true);
        this.$refs.path.validate(true);
        return;
      }
      if (!this.currentUser || !this.db) return;
      this.db
        .collection("rooms")
        .doc(this.path)
        .set({
          owner: this.currentUser.uid,
          title: this.title,
          public: this.isPublic
        })
        .then(() => {
          alertBox.send("success", "Room created", 3000);
          this.$router.push(`/r/${this.path}`);
        })
        .catch(e => alertBox.send("error", e.message, 10000));
    }
  },
  mounted() {
    this.$root.$on("onAuthStateChanged", user => {
      this.currentUser = user;
      this.getRooms();
    });
    this.db = firebase.firestore();
    if (this.currentUser) {
      this.getRooms();
    }
  },
  computed: {
    hintText() {
      return `Room url will be ${location.host}/r/${this.path}`;
    }
  }
};
</script>
