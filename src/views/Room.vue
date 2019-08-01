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
    <v-layout v-if="loading" align-center justify-center row text-xs-center>
      <v-flex xs12>
        <v-progress-circular :size="50" indeterminate color="primary"></v-progress-circular>
      </v-flex>
    </v-layout>
    <v-layout v-else text-xs-center justify-center align-center wrap row>
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
<<<<<<< Updated upstream
=======

            <v-tooltip bottom>
              <template v-slot:activator="{ on }">
                <v-btn
                  icon
                  @click.left.exact="syncVideo(false)"
                  @click.shift.left.exact="syncVideo(true)"
                  v-on="on"
                >
                  <v-icon>autorenew</v-icon>
                </v-btn>
              </template>
              <span>
                Sync own client
                <br />Shift+Click to sync all clients
              </span>
            </v-tooltip>

>>>>>>> Stashed changes
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
              <v-chip
                v-for="user in users"
                :key="user.displayName"
                :color="user.isMe ? 'primary' : ''"
              >
                <v-avatar v-if="user.avatar">
                  <img :src="user.avatar" alt="Avatar" />
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
            <v-form @submit="addVideo">
              <v-text-field
                label="YouTube search or URL"
                @input="searchVideo"
                @focusin="showResults = true"
                @focusout="searchHover ? (showResults = true) : (showResults = false)"
                v-model="youtubeSearch"
                clearable
              >
                <template v-slot:prepend>
                  <v-tooltip bottom>
                    <template v-slot:activator="{ on }">
                      <v-icon
                        :class="showResults ? '' : 'hide'"
                        @click="showResults = false"
                        v-on="on"
                      >list</v-icon>
                    </template>
                    Back to playlist
                  </v-tooltip>
                </template>
                <v-icon color="success" slot="append" @click="addVideo">search</v-icon>
              </v-text-field>
              <input type="submit" class="hide" />
            </v-form>
            <div
              v-if="queue && queue.length > 0 || showResults && searchResults.length > 0"
              @mouseenter="searchHover = true"
              @mouseleave="listMouseLeave"
            >
              <v-list two-line v-if="showResults && searchResults.length > 0">
                <v-list-tile
                  v-for="video in searchResults"
                  :key="video.id.videoId"
                  @click="(() => { return; })"
                >
                  <img
                    :src="`https://img.youtube.com/vi/${video.id.videoId}/mqdefault.jpg`"
                    height="50"
                    width="88.889"
                    class="playlist-thumbnail"
                  />
                  <v-list-tile-content>
                    <v-list-tile-title>
                      <a
                        :class="darkMode ? 'no-link-deko white--text' : 'no-link-deko black--text'"
                        :href="`https://www.youtube.com/watch?v=${video.id.videoId}`"
                        target="_blank"
                      >
                        {{parseYoutubeTitle(video.snippet.title)}}
                        <v-icon small>open_in_new</v-icon>
                      </a>
                    </v-list-tile-title>
                    <v-list-tile-sub-title>
                      <span class="text--primary">{{video.snippet.channelTitle}}</span>
                      &mdash; {{video.snippet.description}}
                    </v-list-tile-sub-title>
                  </v-list-tile-content>
                  <v-spacer></v-spacer>
                  <v-icon
                    @click="addVideo(null, video.id.videoId, parseYoutubeTitle(video.snippet.title))"
                    color="success"
                  >play_arrow</v-icon>
                </v-list-tile>
              </v-list>
<<<<<<< Updated upstream
              <v-list v-else>
                <v-list-tile v-for="video in queue" :key="video.uid" avatar>
                  <img
                    :src="`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`"
                    height="50"
                    width="88.889"
                    class="playlist-thumbnail"
                  >
                  <v-list-tile-content>
                    <v-list-tile-title>
                      <a
                        :class="darkMode ? 'no-link-deko white--text' : 'no-link-deko black--text'"
                        :href="`https://www.youtube.com/watch?v=${video.videoId}`"
                        target="_blank"
                      >
                        {{video.title}}
                        <v-icon small>open_in_new</v-icon>
                      </a>
                    </v-list-tile-title>
                  </v-list-tile-content>
                  <v-spacer></v-spacer>
                  <v-icon @click="pushVideo(video.uid)" color="success">play_arrow</v-icon>
                  <v-icon @click="removeVideo(video.uid)" color="error">close</v-icon>
                </v-list-tile>
=======
              <v-list two-line v-show="queue.length > 0 && !showSearchResults">
                <draggable @end="playlistSortEnd($event)" filter="a, i.v-icon">
                  <transition-group type="transition" name="flip-list">
                    <v-list-tile
                      v-for="(video, index) in queue"
                      :key="video.uid"
                      avatar
                      :uid="video.uid"
                      class="move-cursor"
                      :class="userSettings.darkMode ? 'queue-item-dark' : 'queue-item'"
                    >
                      <span class="queue-number">#{{index + 1}}</span>
                      <img
                        :src="`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`"
                        height="50"
                        width="88.889"
                        class="playlist-thumbnail"
                      />
                      <v-list-tile-content>
                        <v-list-tile-title>
                          <a
                            :class="userSettings.darkMode ? 'no-link-deko white--text' : 'no-link-deko black--text'"
                            :href="`https://www.youtube.com/watch?v=${video.videoId}`"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{video.title}}
                            <v-icon small>open_in_new</v-icon>
                          </a>
                          <span class="queue-user grey--text text--lighten--1"> ● Added by {{video.user.displayName}}</span>
                        </v-list-tile-title>
                        <v-list-tile-sub-title>
                          <span class="text--primary">{{parseYoutubeTitle(video.source)}}</span>
                          &mdash; {{video.description}}
                        </v-list-tile-sub-title>
                      </v-list-tile-content>
                      <v-spacer></v-spacer>
                      <v-icon
                        v-if="index !== 0"
                        @click="moveVideo(video.uid, 0)"
                        color="success"
                        class="no-select"
                      >play_arrow</v-icon>
                      <v-icon @click="removeVideo(video.uid)" color="error" class="no-select">close</v-icon>
                    </v-list-tile>
                  </transition-group>
                </draggable>
>>>>>>> Stashed changes
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
import YouTube from "youtube-node";
import settings from "../settings.json";

const youTube = new YouTube();
let searchTimeout = null;

youTube.setKey(settings.youTubeAPIKey);

export default {
  props: ["alertBox", "currentUser", "socket", "darkMode"],
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
        videoId: "null"
      },
      dbListener: null,
      theatre: false,
      users: [],
      preventPlayerEvents: true,
      youtubeSearch: "",
      queue: [],
      loading: true,
      searchResults: [],
      showResults: false,
      searchHover: false,
      playerStatus: {status: "play"},
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
        .catch(e => this.alertBox.send("error", e, 10000));
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
          .catch(e => this.alertBox.send("error", e, 10000));
      return;
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
      let oldTime = 0.0;
      setTimeout(() => {
        this.preventPlayerEvents = true;
        if (this.socket && this.socket.connected)
          this.socket.emit("getQueue", this.roomID);
      }, 0);
      setTimeout(() => {
        if (this.socket && this.socket.connected)
          this.socket.emit("getPlayerStatus", this.roomID);
      }, 1500);
      setInterval(() => {
        if (!this.youTubePlayer) return;
        this.youTubePlayer.getCurrentTime().then(time => {
          if (time < oldTime - 0.5 || time > oldTime + 0.5) {
            this.onSeek();
          }
          oldTime = time;
        });
      }, 75);
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
                  .catch(e => this.alertBox.send("error", e, 10000));
              }
            });
            this.socket.on("roomUsersUpdate", users => {
              if (users) {
                users.forEach((user, index) => {
                  if (user.id === this.socket.id) {
                    const me = user;
                    user.isMe = true;
                    users.splice(index, 1);
                    users.unshift(me);
                  }
                });
                users = [...new Set(users)];
                this.users = users;
              }
            });
            this.socket.on("playerStatusUpdate", playerStatus => {
              if (playerStatus && playerStatus.status) this.playerStatus.status = playerStatus.status;
              if (playerStatus.status === "pause") {
                this.preventPlayerEvents = true;
                this.youTubePlayer.pauseVideo();
                this.youTubePlayer.seekTo(playerStatus.currentTime);
              } else if (playerStatus.status === "play") {
                this.preventPlayerEvents = true;
                this.youTubePlayer.getCurrentTime().then(time => {
                  if (
                    time < playerStatus.currentTime - 1 ||
                    time > playerStatus.currentTime
                  )
                    this.youTubePlayer.seekTo(playerStatus.currentTime);
                });
                this.youTubePlayer.playVideo();
              }
            });
            this.socket.on("updateQueue", queue => {
              if (queue) this.queue = queue;
              if (queue && queue.length > 0) {
                this.playerData.videoSource = queue[0].videoSource || "";
                this.playerData.videoId = queue[0].videoId || "null";
              } else {
                this.playerData.videoSource = "";
                this.playerData.videoId = "null";
              }
            });
          }
        }, 0);
      }
    },
    onPlay() {
      this.playerStatus.status = "play";
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      console.log("onPlay");
      if (this.queue.length < 1) return;
      if (this.roomID && this.socket) {
        this.youTubePlayer.getCurrentTime().then(time => {
          this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
            status: "play",
            currentTime: time
          });
        });
      }
    },
    onPause() {
      this.playerStatus.status = "pause";
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      if (this.queue.length < 1) return;
      if (this.roomID && this.socket) {
        this.youTubePlayer.getCurrentTime().then(time => {
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
    onEnded() {
      if (
        this.queue.length > 1 &&
        this.playerData.videoId === this.queue[1].videoId
      ) {
        this.preventPlayerEvents = true;
        this.youTubePlayer.seekTo(0);
      }
      if (this.queue.length > 0) {
        this.preventPlayerEvents = true;
        if (this.socket && this.socket.connected)
          this.socket.emit("removeVideo", this.roomID, this.queue[0].uid);
      }
      if (this.queue.length === 1) {
        document.exitFullscreen();
      }
    },
    addVideo(event, videoId, title) {
      if (event) event.preventDefault();
      if (!videoId) videoId = this.$youtube.getIdFromUrl(this.youtubeSearch);
      if (!videoId) return;

      const sendUpdate = () => {
        if (this.socket && this.socket.connected)
          this.socket.emit("sendVideoUpdate", this.roomID, {
            videoSource: "youtube",
            videoId: videoId,
            title
          });
      };

      if (title) {
        sendUpdate();
      } else {
        youTube.getById(videoId, (error, result) => {
          if (error) {
            console.error(error);
            title = "YouTube Video";
          } else {
            if (result.pageInfo.totalResults > 0) {
              title = this.parseYoutubeTitle(result.items[0].snippet.title);
            } else {
              title = "YouTube Video";
            }
          }
          sendUpdate();
        });
      }
    },
    removeVideo(uid) {
      if (!!uid && this.socket && this.socket.connected)
        this.socket.emit("removeVideo", this.roomID, uid);
    },
    pushVideo(uid) {
      if (!!uid && this.socket && this.socket.connected)
        this.socket.emit("pushVideo", this.roomID, uid);
    },
    youtubeOnError(e) {
      if (e) console.log("youtubeOnError", e);
    },
    onSeek() {
      if (!this.youTubePlayer || !this.socket || !this.socket.connected) return;
      // this.youTubePlayer.getCurrentTime().then(time => {
      //   this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
      //     status: this.playerStatus.status,
      //     currentTime: time
      //   });
      // });
    },
    searchVideo() {
      if (this.youtubeSearch === "" || this.youtubeSearch.length < 1) return;
      if (searchTimeout !== null) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        youTube.search(
          this.youtubeSearch,
          10,
          { type: "video", part: "snippet" },
          (error, results) => {
            if (error) console.error(error);
            this.searchResults = results.items;
          }
        );
      }, 333);
    },
    listMouseLeave() {
      this.searchHover = false;
    },
    parseYoutubeTitle(title) {
      if (!title) return;
      const parser = new DOMParser();
      return parser.parseFromString(
        "<!doctype HTML><body>" + title,
        "text/html"
      ).body.textContent;
    }
  },
  beforeRouteLeave(to, from, next) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("leaveRoom", this.roomID);
    }
    next();
  },
  mounted() {
    let roomHistory = [];
    this.db = firebase.firestore();
    if (this.db) {
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .get()
        .then(querySnapshot => {
          this.loading = false;
          if (querySnapshot.exists) {
            this.roomData = querySnapshot.data();
            this.title = this.roomData.title;
            this.path = querySnapshot.id;
            this.isPublic = this.roomData.public;

            if (!localStorage.roomHistory) {
              localStorage.roomHistory = JSON.stringify(roomHistory);
            }
            roomHistory = JSON.parse(localStorage.roomHistory);
            roomHistory = roomHistory.filter(room => room.id !== this.roomID);
            roomHistory.unshift({
              id: this.roomID,
              title: this.roomData.title
            });
            if (roomHistory.length > 5) roomHistory.pop();
            localStorage.roomHistory = JSON.stringify(roomHistory);
          }
        })
        .catch(e => {
          this.alertBox.send("error", e, 10000);
          this.loading = false;
        });
      this.db
        .collection("rooms")
        .doc(this.roomID)
        .onSnapshot(documentSnapshot => {
          this.roomData = documentSnapshot.data();
        });
    }
  }
};
</script>
