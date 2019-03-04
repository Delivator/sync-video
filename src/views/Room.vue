<template>
  <v-container grid-list-md>
    <template v-if="roomData">
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
    </template>
    <v-layout text-xs-center justify-center align-center wrap row>
      <v-flex
        v-if="roomData"
        :class="theatre ? 'xs12 sm12 md12 lg12 xl10' : 'xs12 sm10 md10 lg11 xl8'"
        id="playerFlex"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>{{this.roomData.title}}</v-toolbar-title>
            <v-tooltip bottom>
              <template #activator="data">
                <h5
                  v-on="data.on"
                  :class="`headline ${socket && socket.connected ? 'green' : 'red'}--text`"
                >●</h5>
              </template>
              <span>{{socket && socket.connected ? 'Connected' : 'Not Connected'}}</span>
            </v-tooltip>
            <v-spacer></v-spacer>
            <v-btn icon @click="toggleTheatre">
              <v-icon>{{theatre ? "zoom_out" : "zoom_in"}}</v-icon>
            </v-btn>
            <v-btn
              icon
              @click="dialog = true"
              v-if="currentUser && roomData.owner === currentUser.uid"
            >
              <v-icon>settings</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text ref="player">
            <v-responsive :aspect-ratio="16/9" max-height="100vh">
              <v-container v-if="!queue || queue.length < 1" fluid fill-height>
                <v-layout align-center justify-center>
                  <v-flex xs12>
                    <h1>No videos in queue</h1>
                  </v-flex>
                </v-layout>
              </v-container>
              <youtube
                :video-id="playerData.videoId"
                @ready="playerReady"
                @playing="onPlay"
                @paused="onPause"
                @buffering="onBuffering"
                @ended="onEnded"
                @cued="onCued"
                @error="youtubeOnError"
                :player-vars="playerVars"
                ref="youtube"
                width="100%"
                height="100%"
              ></youtube>
            </v-responsive>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-flex
        v-if="roomData"
        :class="theatre ? 'xs12 sm12 md12 lg12 xl10' : 'xs12 sm10 md10 lg11 xl4'"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Chat</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <div v-if="users && users.length > 0" class="user-list" @wheel="scrollUserList">
              <v-chip v-for="user in users" :key="user.displayName">
                <v-avatar v-if="user.avatar">
                  <img :src="user.avatar" alt="Avatar">
                </v-avatar>
                {{user.displayName}}
              </v-chip>
            </div>
            <p></p>
          </v-card-text>
        </v-card>
      </v-flex>
      <v-flex
        v-if="roomData"
        :class="theatre ? 'xs12 sm12 md12 lg12 xl10' : 'xs12 sm10 md10 lg11 xl10'"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Playlist</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-text-field label="YouTube URL" v-model="youtubeSearch">
              <v-icon color="success" slot="append" @click="addVideo">search</v-icon>
            </v-text-field>
            <div v-if="queue && queue.length > 0">
              <v-list>
                <v-list-tile v-for="video in queue" :key="video.uid" avatar>
                  <img
                    :src="`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`"
                    height="50"
                    width="88.889"
                    class="playlist-thumbnail"
                  >
                  <v-list-tile-content>
                    <v-list-tile-title>https://www.youtube.com/watch?v={{video.videoId}}</v-list-tile-title>
                  </v-list-tile-content>
                  <v-spacer></v-spacer>
                  <v-icon @click="pushVideo(video.uid)" color="success">play_arrow</v-icon>
                  <v-icon @click="removeVideo(video.uid)" color="error">close</v-icon>
                </v-list-tile>
              </v-list>
            </div>
            <div v-else>
              <p>No videos in queue</p>
            </div>
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

<style>
@import "../assets/css/style.css";
</style>

<script>
import firebase from "firebase/app";
import "firebase/firestore";

export default {
  props: ["alertBox", "currentUser", "socket"],
  data() {
    return {
      roomID: this.$route.params.id || null,
      db: null,
      roomData: null,
      dialog: false,
      dialog2: false,
      title: "",
      isPublic: false,
      playerVars: {
        autoplay: 1
      },
      playerData: {
        videoSource: "",
        videoId: ""
      },
      dbListener: null,
      theatre: false,
      users: [],
      preventPlayerEvents: true,
      youtubeSearch: "",
      queue: [],
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
    youTubePlayer() {
      return this.$refs.youtube.player;
    }
  },
  methods: {
    updateRoom(event) {
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
          this.alertBox.send("success", "Room updated", 3000);
          this.$router.push(`/r/${this.path}`);
        })
        .catch(e => this.alertBox.send("error", e.message, 10000));
    },
    deleteRoom(event) {
      if (event) event.preventDefault();
      if (this.db)
        this.db
          .collection("rooms")
          .doc(this.roomID)
          .delete()
          .then(() => {
            this.alertBox.send("success", "Room deleted");
            this.$router.replace("/");
          })
          .catch(e => this.alertBox.send("error", e.message, 10000));
      return;
    },
    playVideo() {
      this.youTubePlayer.playVideo();
    },
    toggleTheatre() {
      this.theatre = !this.theatre;
      if (this.theatre) {
        setTimeout(() => {
          this.$vuetify.goTo(this.$refs.player);
        }, 300);
      }
    },
    scrollUserList(e) {
      if (e.type != "wheel") {
        return;
      }
      let delta = (e.deltaY || -e.wheelDelta || e.detail) >> 10 || 1;
      const userList = document.querySelector(".user-list");
      delta = delta * -300;
      function animateScroll(x) {
        if (x <= 0) return;
        setTimeout(() => {
          userList.scrollLeft -= delta / 100;
          animateScroll(--x);
        }, 0);
      }
      animateScroll(30);
      e.preventDefault();
    },
    playerReady() {
      setTimeout(() => {
        this.preventPlayerEvents = true;
        if (this.socket && this.socket.connected)
          this.socket.emit("getQueue", this.roomID);
      }, 0);
      setTimeout(() => {
        if (this.socket && this.socket.connected)
          this.socket.emit("getPlayerStatus", this.roomID);
      }, 1500);
    },
    onPlay() {
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      if (this.roomID && this.socket) {
        this.$refs.youtube.player.getCurrentTime().then(time => {
          this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
            status: "play",
            currentTime: time
          });
        });
      }
    },
    onPause() {
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      if (this.roomID && this.socket) {
        this.$refs.youtube.player.getCurrentTime().then(time => {
          this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
            status: "pause",
            currentTime: time
          });
        });
      }
    },
    onBuffering() {
      console.log("onBuffering");
    },
    onCued() {
      console.log("onCued");
    },
    onEnded() {
      if (this.queue.length > 0) {
        this.preventPlayerEvents = true;
        console.log("removing", this.queue[0].uid, "from", this.roomID);
        if (this.socket && this.socket.connected)
          this.socket.emit("removeVideo", this.roomID, this.queue[0].uid);
      }
    },
    addVideo() {
      const ytId = this.$youtube.getIdFromUrl(this.youtubeSearch);
      if (!ytId) return;
      if (this.socket && this.socket.connected)
        this.socket.emit("sendVideoUpdate", this.roomID, {
          videoSource: "youtube",
          videoId: ytId
        });
    },
    removeVideo(uid) {
      if ((!!uid, this.socket && this.socket.connected))
        this.socket.emit("removeVideo", this.roomID, uid);
    },
    pushVideo(uid) {
      if ((!!uid, this.socket && this.socket.connected))
        this.socket.emit("pushVideo", this.roomID, uid);
    },
    youtubeOnError(e) {
      if (e) console.log("youtubeOnError", e);
    }
  },
  beforeRouteLeave(to, from, next) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("leaveRoom", this.roomID);
    }
    next();
  },
  mounted() {
    this.db = firebase.firestore();
    if (this.db)
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .get()
        .then(querySnapshot => {
          if (querySnapshot.exists) {
            this.roomData = querySnapshot.data();
            this.title = this.roomData.title;
            this.path = querySnapshot.id;
            this.isPublic = this.roomData.public;
          }
        })
        .catch(e => this.alertBox.send("error", e.message, 10000));
    if (this.db)
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .onSnapshot(documentSnapshot => {
          this.roomData = documentSnapshot.data();
        });
    if (this.roomID) {
      setTimeout(() => {
        if (this.socket) {
          this.socket.emit("joinRoom", this.roomID);
          this.socket.on("reconnect", () => {
            if (this.currentUser && this.socket.connected) {
              this.currentUser
                .getIdToken()
                .then(token => {
                  this.socket.emit("authenticate", token);
                })
                .catch(e => this.alertBox.send("error", e.message, 10000));
            }
          });
          this.socket.on("roomUsersUpdate", users => {
            if (users) this.users = users;
          });
          this.socket.on("playerStatusUpdate", playerStatus => {
            console.log("playerStatusUpdate", playerStatus);
            if (playerStatus.status === "pause") {
              this.preventPlayerEvents = true;
              this.$refs.youtube.player.pauseVideo();
              this.$refs.youtube.player.seekTo(playerStatus.currentTime);
            } else if (playerStatus.status === "play") {
              this.preventPlayerEvents = true;
              this.$refs.youtube.player.getCurrentTime().then(time => {
                if (
                  time < playerStatus.currentTime - 1 ||
                  time > playerStatus.currentTime
                )
                  this.$refs.youtube.player.seekTo(playerStatus.currentTime);
              });
              this.$refs.youtube.player.playVideo();
            }
          });
          this.socket.on("updateQueue", queue => {
            if (queue) this.queue = queue;
            if (queue && queue.length > 0) {
              this.playerData.videoSource = queue[0].videoSource || "";
              this.playerData.videoId = queue[0].videoId || "x";
            } else {
              this.playerData.videoSource = "";
              this.playerData.videoId = "x";
            }
          });
        }
      }, 0);
    }
  }
};
</script>
