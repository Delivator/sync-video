<template>
  <v-container>
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
              <v-switch v-model="isPublic" label="Public"></v-switch>
            </v-card-text>
            <v-card-actions>
              <v-btn color="error" outlined @click="dialog = false"
                >Cancel</v-btn
              >
              <v-spacer></v-spacer>
              <v-btn
                color="error"
                @click="
                  dialog = false;
                  dialog2 = true;
                "
                >Delete</v-btn
              >
              <v-btn color="success" @click="updateRoom" type="submit"
                >Save</v-btn
              >
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
                <span class="font-weight-bold">{{ roomData.title }}</span
                >?
              </h6>
            </v-card-text>
            <v-card-actions>
              <v-btn
                color="error"
                outlined
                @click="
                  dialog2 = false;
                  dialog = true;
                "
                >Cancel</v-btn
              >
              <v-spacer></v-spacer>
              <v-btn color="error" @click="deleteRoom" type="submit"
                >Delete</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-form>
      </v-dialog>
    </template>
    <v-row class="text-center" v-if="loading" align="center" justify="center">
      <v-col cols="12">
        <v-progress-circular
          :size="50"
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-col>
    </v-row>
    <v-row v-else justify="center" align="center">
      <v-col
        v-if="roomData"
        cols="12"
        :sm="theatre ? '12' : '10'"
        :md="theatre ? '12' : '10'"
        :lg="theatre ? '12' : '11'"
        :xl="theatre ? '10' : '8'"
        id="playerFlex"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>{{ this.roomData.title }}</v-toolbar-title>
            <v-tooltip bottom>
              <template #activator="data">
                <h5
                  v-on="data.on"
                  class="headline"
                  :class="socket.connected ? pingColor : 'red--text'"
                >
                  &nbsp;●
                </h5>
              </template>
              <span>{{
                socket && socket.connected
                  ? `Ping: ${ping}ms`
                  : "No connection to server"
              }}</span>
            </v-tooltip>

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

            <v-spacer></v-spacer>
            <v-btn icon @click="toggleTheatre">
              <v-icon>{{ theatre ? "zoom_out" : "zoom_in" }}</v-icon>
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
            <v-responsive
              :aspect-ratio="16 / 9"
              max-height="100vh"
              ref="playerSize"
            >
              <v-container class="fill-height" v-if="queue.length < 1" fluid>
                <v-row class="text-center" align="center" justify="center">
                  <v-col cols="12">
                    <h1>No videos in queue</h1>
                  </v-col>
                </v-row>
              </v-container>
              <div v-show="showYTPlayer" class="player">
                <youtube
                  :video-id="playerData.videoId"
                  @ready="youtubeReady"
                  @playing="youtubePlaying"
                  @paused="youtubePaused"
                  @ended="youtubeEnded"
                  @error="youtubeError"
                  :player-vars="playerVars"
                  ref="youtube"
                  width="100%"
                  height="100%"
                ></youtube>
              </div>
              <video
                ref="directPlayer"
                controls
                autoplay
                muted
                height="1"
                v-show="showDirectPlayer"
                class="player"
                @pause="playerPaused"
                @playing="playerPlaying"
                @seeked="playerSeeked"
                @seeking="playerSeeking"
                @ended="playerEnded"
              ></video>
            </v-responsive>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        v-if="roomData"
        cols="12"
        :sm="theatre ? '12' : '10'"
        :md="theatre ? '12' : '10'"
        :lg="theatre ? '12' : '11'"
        :xl="theatre ? '10' : '4'"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Chat</v-toolbar-title>
          </v-toolbar>
          <v-card-text :style="'height: ' + videoPlayerHight">
            <div class="chat">
              <div class="header">
                <div class="text-center" v-if="!socket.connected">
                  <v-progress-circular
                    color="primary"
                    indeterminate
                  ></v-progress-circular>
                </div>
                <div
                  v-else-if="users && users.length > 0"
                  class="user-list"
                  @wheel="scrollUserList"
                >
                  <v-chip
                    v-for="user in users"
                    :key="user.displayName"
                    :class="user.isMe ? 'primary white--text' : ''"
                  >
                    <v-avatar v-if="user.avatar" left>
                      <img :src="user.avatar" alt="Avatar" />
                    </v-avatar>
                    {{ user.displayName }}
                  </v-chip>
                </div>
                <div v-else class="text-center">
                  <p class="subheading">No users connected</p>
                </div>
                <v-divider class="divider-margin"></v-divider>
              </div>
              <div class="content chat-wrapper">
                <div v-for="(message, index) in messages" :key="index">
                  <span class="timestamp no-select">{{
                    convertTimestamp(message.timestamp)
                  }}</span>
                  <div v-if="message.type === 'join'" class="text-center">
                    <v-icon class="green--text">arrow_forward</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                  </div>
                  <div v-else-if="message.type === 'leave'" class="text-center">
                    <v-icon class="red--text">arrow_back</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                  </div>
                  <div v-else-if="message.type === 'add'" class="text-center">
                    <v-icon>playlist_add</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                    added
                    <span class="font-weight-bold">{{ message.message }}</span>
                  </div>
                  <div
                    v-else-if="message.type === 'remove'"
                    class="text-center"
                  >
                    <v-icon class="red--text">remove</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                    removed
                    <span class="font-weight-bold">{{ message.message }}</span>
                  </div>
                  <div v-else-if="message.type === 'pause'" class="text-center">
                    <v-icon>pause</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                    paused at
                    <span class="font-weight-bold">{{
                      convertSeconds(Math.floor(message.message))
                    }}</span>
                  </div>
                  <div v-else-if="message.type === 'play'" class="text-center">
                    <v-icon>play_arrow</v-icon>
                    <span class="font-weight-bold">{{ message.user }}</span>
                    played at
                    <span class="font-weight-bold">{{
                      convertSeconds(Math.floor(message.message))
                    }}</span>
                  </div>
                  <div
                    v-else-if="message.type === 'message'"
                    class="chat-bubble"
                  >
                    <span class="font-weight-bold">{{ message.user }}</span
                    >: {{ message.message }}
                  </div>
                </div>
              </div>
              <div class="footer">
                <v-form @submit.prevent="sendMessage">
                  <v-text-field
                    v-model="chatInput"
                    append-icon="send"
                    :rules="[rules.chat]"
                    label="Write a message..."
                    counter
                    @click:append="sendMessage"
                    maxlength="500"
                  ></v-text-field>
                </v-form>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        v-if="roomData"
        cols="12"
        :sm="theatre ? '12' : '10'"
        :md="theatre ? '12' : '10'"
        :lg="theatre ? '12' : '11'"
        :xl="theatre ? '10' : '10'"
      >
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title
              >Playlist{{
                queue.length > 0 ? ` (${queue.length}): ${queue[0].title}` : ""
              }}</v-toolbar-title
            >
          </v-toolbar>
          <v-card-text>
            <v-form @submit="addVideo">
              <v-text-field
                label="YouTube search or URL"
                @input="searchVideo"
                @focusin="showSearchResults = searchResults.length > 0"
                @focusout="showSearchResults = searchHover"
                @click:clear="showSearchResults = false"
                v-model="youtubeSearch"
                clearable
              >
                <template v-slot:prepend>
                  <v-tooltip bottom>
                    <template v-slot:activator="{ on }">
                      <v-icon
                        :class="showSearchResults ? '' : 'hide'"
                        @click="showSearchResults = false"
                        v-on="on"
                        >list</v-icon
                      >
                    </template>
                    Back to playlist view
                  </v-tooltip>
                </template>
                <v-icon color="success" slot="append" @click="addVideo"
                  >search</v-icon
                >
              </v-text-field>
              <input type="submit" class="hide" />
            </v-form>
            <div
              v-show="queue.length > 0 || showSearchResults"
              @mouseenter="searchHover = true"
              @mouseleave="searchHover = false"
            >
              <h6 class="title text-center" v-if="showSearchResults">
                YouTube search results:
              </h6>
              <v-list two-line v-show="showSearchResults">
                <v-list-item
                  v-for="(video, index) in searchResults"
                  two-line
                  :key="index"
                  :class="
                    userSettings.darkMode ? 'queue-item-dark' : 'queue-item'
                  "
                >
                  <img
                    :src="video.thumbnail"
                    height="50"
                    width="88.889"
                    class="playlist-thumbnail"
                  />
                  <v-list-item-content>
                    <v-list-item-title>
                      <a
                        :class="
                          `no-link-deko ${
                            userSettings.darkMode
                              ? 'white--text'
                              : 'black--text'
                          }`
                        "
                        :href="video.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ video.title }}
                        <v-icon small>open_in_new</v-icon>
                      </a>
                      <span v-if="video.duration">
                        {{ convertSeconds(video.duration) }}</span
                      >
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <span class="text--primary">
                        <a
                          :href="video.channel_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          :class="
                            `no-link-deko ${
                              userSettings.darkMode
                                ? 'white--text'
                                : 'black--text'
                            }`
                          "
                          >{{ video.channel }}</a
                        >
                      </span>
                      &mdash; {{ video.description }}
                    </v-list-item-subtitle>
                  </v-list-item-content>
                  <v-list-item-action>
                    <v-btn
                      icon
                      ripple
                      @click="
                        addVideo(
                          $event,
                          video.url,
                          video.title,
                          video.channel,
                          video.channel_url,
                          video.description,
                          video.duration ? video.duration : 0.0,
                          video.thumbnail,
                          video.source
                        )
                      "
                      class="playlist-add-button"
                    >
                      <v-icon class="playlist-add-icon">playlist_add</v-icon>
                    </v-btn>
                  </v-list-item-action>
                </v-list-item>
                <v-row v-observe-visibility="loadNext">
                  <v-col cols="12" class="text-center">
                    <v-progress-circular
                      indeterminate
                      color="primary"
                      v-show="showSearchLoading"
                    ></v-progress-circular>
                  </v-col>
                </v-row>
              </v-list>
              <v-list two-line v-show="queue.length > 0 && !showSearchResults">
                <draggable @end="playlistSortEnd($event)" filter="a, i.v-icon">
                  <transition-group type="transition" name="flip-list">
                    <v-list-item
                      v-for="(video, index) in queue"
                      :key="video.uid"
                      :uid="video.uid"
                      class="move-cursor"
                      :class="
                        userSettings.darkMode ? 'queue-item-dark' : 'queue-item'
                      "
                    >
                      <span class="queue-number">#{{ index + 1 }}</span>
                      <img
                        :src="video.thumbnail"
                        height="50"
                        width="88.889"
                        class="playlist-thumbnail"
                      />
                      <v-list-item-content>
                        <v-list-item-title>
                          <a
                            :class="
                              userSettings.darkMode
                                ? 'no-link-deko white--text'
                                : 'no-link-deko black--text'
                            "
                            :href="video.url"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{ video.title }}
                            <v-icon small>open_in_new</v-icon>
                          </a>
                          <span> {{ convertSeconds(video.duration) }}</span>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          <span class="text--primary">
                            <a
                              :href="video.channel_url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="no-link-deko white--text"
                              >{{ video.channel }}</a
                            >
                          </span>
                          &mdash; {{ video.description }}
                        </v-list-item-subtitle>
                      </v-list-item-content>
                      <v-icon
                        v-if="index !== 0"
                        @click="moveVideo(video.uid, 0)"
                        color="success"
                        class="no-select"
                        >play_arrow</v-icon
                      >
                      <v-icon
                        @click="removeVideo(video.uid)"
                        color="error"
                        class="no-select"
                        >close</v-icon
                      >
                    </v-list-item>
                  </transition-group>
                </draggable>
              </v-list>
            </div>
            <div v-show="queue.length < 1 && !showSearchResults">
              <v-container>
                <v-row>
                  <v-col cols="12">
                    <h6 class="title text-center">No videos in queue</h6>
                  </v-col>
                </v-row>
              </v-container>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-else cols="8" class="text-center">
        <h1 class="display-4 font-weight-bold">404</h1>
        <h5 class="headline font-weight-light">
          Room not found. Create one here:
        </h5>
        <v-btn to="/rooms">My rooms</v-btn>
      </v-col>
    </v-row>
    <v-alert type="info" dismissible v-model="showAlert"
      >Video {{ videoTitle }} added</v-alert
    >
  </v-container>
</template>

<style>
@import "../assets/css/style.css";
</style>

<script>
import settings from "../settings.json";
import draggable from "vuedraggable";
import * as iso8601duration from "iso8601-duration";
import * as fb from "../fb";
import * as Hls from "hls.js";

let searchTimeout = null;

// https://stackoverflow.com/a/7579799
function convertSeconds(seconds) {
  let hours = Math.floor(seconds / 3600);
  let minutes = Math.floor((seconds - hours * 3600) / 60);
  var time = "";
  seconds = seconds - hours * 3600 - minutes * 60;

  if (hours != 0) {
    time = hours + ":";
  }
  if (minutes != 0 || time !== "") {
    minutes = minutes < 10 && time !== "" ? "0" + minutes : String(minutes);
    time += minutes + ":";
  }
  if (time === "") {
    time = seconds + "s";
  } else {
    time += seconds < 10 ? "0" + seconds : String(seconds);
  }
  return time;
}
function pad(val) {
  return val < 10 ? "0" + val : val;
}

function convertTimestamp(timestamp) {
  var h = new Date(timestamp).getHours();
  var m = new Date(timestamp).getMinutes();
  return pad(h) + ":" + pad(m);
}

let testPlayer = document.createElement("video");

function testDirectSource(url) {
  return new Promise((resolve, reject) => {
    if (!url || url.length < 1) return reject(false);
    testPlayer.src = url;
    if (Hls.isSupported()) {
      console.log("Hls supported");
      let hls = new Hls();
      hls.loadSource(url);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.attachMedia(testPlayer);
        testPlayer.addEventListener("loadeddata", () => {
          resolve(Math.floor(testPlayer.duration));
          testPlayer.src = "";
        });
      });
    }
    testPlayer.addEventListener("loadeddata", () => {
      resolve(Math.floor(testPlayer.duration));
      testPlayer.src = "";
    });
  });
}

export default {
  components: {
    draggable
  },
  props: [
    "alertBox",
    "currentUser",
    "socket",
    "userSettings",
    "ping",
    "pingColor"
  ],
  data() {
    return {
      roomID: this.$route.params.id || null,
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
      theatre: false,
      users: [],
      preventPlayerEvents: false,
      firstPlayerEvent: true,
      youtubeSearch: "",
      queue: [],
      loading: true,
      searchResults: [],
      showSearchResults: false,
      searchHover: false,
      playerStatus: { status: "play" },
      rules: {
        required: value => !!value || "Required.",
        title: value => 1 < value.length <= 64 || "1-64 Characters",
        chat: value => 1 < value.length <= 500 || "1-500 Characters"
      },
      videoTitle: "",
      showAlert: false,
      nextPageToken: "",
      convertSeconds,
      loadNextVisible: false,
      showSearchLoading: false,
      videoPlayerHight: "",
      chatInput: "",
      messages: [],
      convertTimestamp,
      mediaSource: "",
      disableSeekEvent: false
    };
  },
  computed: {
    hintText() {
      return `Room url will be ${location.host}/r/${this.path}`;
    },
    youTubePlayer() {
      return this.$refs.youtube.player;
    },
    directPlayer() {
      return this.$refs.directPlayer;
    },
    showYTPlayer() {
      return this.queue.length > 0 && this.queue[0].source === "youtube";
    },
    showDirectPlayer() {
      return this.queue.length > 0 && this.queue[0].source === "direct";
    }
  },
  methods: {
    updateRoom(event) {
      if (event) event.preventDefault();
      if (!this.$refs.title.valid) return this.$refs.title.validate(true);
      if (!this.currentUser) return;
      this.dialog = false;
      fb.rooms
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
      fb.rooms
        .doc(this.roomID)
        .delete()
        .then(() => {
          let roomHistory = [];
          this.alertBox.send("success", "Room deleted");
          // remove current room from history
          roomHistory = this.userSettings.roomHistory;
          roomHistory = roomHistory.filter(room => room.id !== this.roomID);
          this.userSettings.roomHistory = roomHistory;
          this.$router.replace("/");
        })
        .catch(e => this.alertBox.send("error", e, 10000));
      return;
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
    getVideos(videos, part = "") {
      return new Promise((resolve, reject) => {
        let url = new URL("https://www.googleapis.com/youtube/v3/videos");
        if (part) part = "," + part;
        let params = {
          key: settings.youTubeAPIKey,
          part: "id" + part,
          id: videos
        };
        Object.keys(params).forEach(key =>
          url.searchParams.append(key, params[key])
        );
        fetch(url)
          .then(result => {
            if (result.status !== 200) return false;
            result
              .json()
              .then(data => resolve(data))
              .catch(reject);
          })
          .catch(reject);
      });
    },
    youtubeReady() {
      console.log("youtube player ready");
      let oldTime = 0.0;

      this.videoPlayerHight = this.$refs.player.clientHeight + "px";

      setTimeout(() => {
        if (this.socket && this.socket.connected)
          this.socket.emit("getPlayerStatus", this.roomID);
        setTimeout(() => {
          this.firstPlayerEvent = false;
          this.preventPlayerEvents = false;
          this.disableSeekEvent = false;
        }, 500);
      }, 750);

      // Custom seek "event" because the youtube embed player
      // doesn't have a "seeked" event
      const checkYoutubeSeek = () => {
        // check every 75ms if the player is offset
        // by -0.5s or +0.5s
        if (!document.hidden && this.youTubePlayer) {
          this.youTubePlayer.getCurrentTime().then(time => {
            if (time < oldTime - 0.5 || time > oldTime + 0.5) {
              this.onSeek();
            }
            oldTime = time;
          });
        }
        setTimeout(checkYoutubeSeek, 75);
      };
      checkYoutubeSeek();

      if (this.roomID) {
        setTimeout(() => {
          if (this.socket) {
            if (this.socket.connected) {
              this.socket.emit("joinRoom", this.roomID);
              this.socket.emit("getQueue", this.roomID);
            }
            this.socket.on("reconnect", () => {
              setTimeout(() => {
                this.socket.emit("joinRoom", this.roomID);
                if (this.currentUser) {
                  this.currentUser
                    .getIdToken()
                    .then(token => {
                      this.socket.emit("authenticate", token);
                    })
                    .catch(e => this.alertBox.send("error", e, 10000));
                }
              }, 0);
            });
            this.socket.on("roomUsersUpdate", users => {
              if (!users) return;
              let addedUsers = [];
              let newUsers = [];
              users.forEach((user, index) => {
                if (user.id === this.socket.id) {
                  const me = user;
                  user.isMe = true;
                  users.splice(index, 1);
                  users.unshift(me);
                }
              });
              users = [...new Set(users)];
              users.forEach(user => {
                if (addedUsers.includes(user.uid)) return;
                newUsers.push(user);
                addedUsers.push(user.uid);
                addedUsers = [...new Set(addedUsers)];
              });
              newUsers = [...new Set(newUsers)];
              this.users = newUsers;
            });
            this.socket.on("playerStatusUpdate", playerStatus => {
              if (playerStatus && playerStatus.status)
                this.playerStatus = playerStatus;
              if (!this.queue[0]) return false;
              this.mediaSource = this.queue[0].source;
              if (this.mediaSource === "youtube") {
                if (playerStatus.status === "pause") {
                  this.youTubePlayer
                    .getPlayerState()
                    .then(state => {
                      if (isNaN(state))
                        return console.error("[YouTube Player] State is NaN");
                      if (state !== 2) {
                        this.preventPlayerEvents = true;
                        this.youTubePlayer.pauseVideo();
                      }
                      this.disableSeekEvent = true;
                      this.youTubePlayer.seekTo(playerStatus.currentTime);
                    })
                    .catch(console.error);
                } else if (playerStatus.status === "play") {
                  this.youTubePlayer
                    .getCurrentTime()
                    .then(currentTime => {
                      let newTime = playerStatus.currentTime;
                      if (
                        playerStatus.force ||
                        currentTime < newTime - 0.5 ||
                        currentTime > newTime + 0.5
                      ) {
                        this.disableSeekEvent = true;
                        this.youTubePlayer.seekTo(playerStatus.currentTime);

                        this.youTubePlayer
                          .getPlayerState()
                          .then(state => {
                            if (isNaN(state))
                              return console.error(
                                "[YouTube Player] State is NaN"
                              );
                            if (state !== 1) {
                              this.preventPlayerEvents = true;
                              this.youTubePlayer.playVideo();
                            }
                          })
                          .catch(console.error);
                      } else {
                        this.youTubePlayer
                          .getPlayerState()
                          .then(state => {
                            if (isNaN(state))
                              return console.error(
                                "[YouTube Player] State is NaN"
                              );
                            if (state !== 1) {
                              this.preventPlayerEvents = true;
                              this.youTubePlayer.playVideo();
                            }
                          })
                          .catch(console.error);
                      }
                    })
                    .catch(console.error);
                }
              } else if (this.mediaSource === "direct") {
                if (playerStatus.status === "pause") {
                  if (!this.directPlayer.paused) {
                    this.preventPlayerEvents = true;
                    this.directPlayer.pause();
                  }
                  this.disableSeekEvent = true;
                  this.directPlayer.currentTime = playerStatus.currentTime;
                } else if (playerStatus.status === "play") {
                  let currentTime = this.directPlayer.currentTime;
                  let newTime = playerStatus.currentTime;
                  if (
                    playerStatus.force ||
                    currentTime < newTime - 0.5 ||
                    currentTime > newTime + 0.5
                  ) {
                    this.directPlayer.currentTime = playerStatus.currentTime;
                  }
                  if (this.directPlayer.paused) {
                    this.preventPlayerEvents = true;
                    this.directPlayer.play();
                  }
                }
              }
            });
            this.socket.on("updateQueue", queue => {
              let oldSource = this.queue.length > 0 ? this.queue[0].source : "";
              if (queue) this.queue = queue;
              if (queue && queue.length > 0) {
                if (oldSource && oldSource !== queue[0].source)
                  this.resetPlayers();
                if (queue[0].source === "youtube") {
                  this.playerData.videoSource = queue[0].source || "";
                  this.playerData.videoId =
                    this.$youtube.getIdFromUrl(queue[0].url) || "null";
                } else if (queue[0].source === "direct") {
                  if (this.directPlayer.src !== queue[0].url)
                    this.directPlayer.src = queue[0].url;
                }
              } else {
                // when the queue is empty
                this.resetPlayers();
              }
            });
            this.socket.on("message", message => {
              if (message) this.messages.push(message);
              let chat = document.querySelector(".chat-wrapper");
              setTimeout(() => {
                chat.scrollTop = chat.scrollHeight;
              }, 250);
            });
          }
        }, 0);
      }
    },
    youtubePlaying() {
      if (this.queue.length < 1 || this.firstPlayerEvent) return;
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);

      this.playerStatus.status = "play";
      if (this.roomID && this.socket) {
        this.youTubePlayer.getCurrentTime().then(time => {
          this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
            status: "play",
            currentTime: time
          });
        });
      }
    },
    youtubePaused() {
      if (this.queue.length < 1 || this.firstPlayerEvent) return;
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);

      this.playerStatus.status = "pause";
      if (this.roomID && this.socket) {
        this.youTubePlayer.getCurrentTime().then(time => {
          this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
            status: "pause",
            currentTime: time
          });
        });
      }
    },
    youtubeEnded() {
      this.resetPlayers();
    },
    youtubeBuffering() {
      console.log("youtube player buffering");
    },
    animatePlaylistAddButton(iconElement) {
      if (iconElement.classList.contains("playlist-add-icon")) {
        iconElement.innerHTML = "playlist_add_check";
        if (this.userSettings.darkMode) {
          iconElement.classList.add("animate-playlist-add-dark");
        } else {
          iconElement.classList.add("animate-playlist-add-bright");
        }
        setTimeout(() => {
          iconElement.classList.remove("animate-playlist-add-dark");
          iconElement.classList.remove("animate-playlist-add-bright");
          iconElement.innerHTML = "playlist_add";
        }, 1000);
      }
    },
    addVideo(
      event,
      url,
      title,
      channel = "",
      channel_url = "",
      description = "",
      duration = 0.0,
      thumbnail = "",
      source = ""
    ) {
      if (event && event.type === "submit") event.preventDefault();
      let videoId = this.$youtube.getIdFromUrl(url ? url : this.youtubeSearch);

      if (event) {
        if (event.srcElement) {
          if (event.srcElement.classList.contains("playlist-add-icon")) {
            this.animatePlaylistAddButton(event.srcElement);
          } else if (event.srcElement.querySelector(".playlist-add-icon")) {
            this.animatePlaylistAddButton(
              event.srcElement.querySelector(".playlist-add-icon")
            );
          }
        }
      }

      const sendUpdate = options => {
        if (this.socket && this.socket.connected) {
          this.socket.emit("addVideo", this.roomID, options, err => {
            if (err)
              return this.alertBox.send(
                "error",
                `Error adding the video: ${err}`
              );
            this.alertBox.send("info", `Video ${title} added`, 2000);
          });
        }
      };
      console.log("addVideo", source);
      if (source === "youtube") {
        let options = {
          source: "youtube",
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title,
          channel,
          channel_url,
          description,
          duration,
          thumbnail
        };

        if (title) {
          // max title, source, description length
          title = String(title).substring(0, 100);
          channel = String(channel).substring(0, 100);
          description = String(description).substring(0, 250);
          sendUpdate(options);
        } else {
          title = "YouTube Video";
          this.getVideos(videoId, "snippet,contentDetails")
            .then(videos => {
              if (videos && videos.items && videos.items.length > 0) {
                let video = videos.items[0];
                title = this.parseHtml(video.snippet.title);
                channel = video.snippet.channelTitle.substring(0, 100);
                description = video.snippet.description.substring(0, 250);
                duration = iso8601duration.toSeconds(
                  iso8601duration.parse(video.contentDetails.duration)
                );
                thumbnail = video.snippet.thumbnails.medium.url;
                sendUpdate(options);
              }
            })
            .catch(error => {
              this.alertBox.send("error", error);
              sendUpdate(options);
            });
        }
      } else if (source === "direct") {
        sendUpdate({
          source: "direct",
          url,
          title,
          channel,
          channel_url,
          description,
          duration,
          thumbnail
        });
      }
    },
    removeVideo(uid) {
      if (!!uid && this.socket && this.socket.connected)
        this.socket.emit("removeVideo", this.roomID, uid);
    },
    moveVideo(uid, position) {
      if (
        !!uid &&
        position != undefined &&
        !isNaN(position) &&
        !!this.socket &&
        this.socket.connected
      )
        this.socket.emit("moveVideo", this.roomID, uid, position);
    },
    youtubeError(e) {
      if (e) console.log("youtubeError", e);
    },
    onSeek() {
      if (this.disableSeekEvent) return (this.disableSeekEvent = false);
      if (!this.youTubePlayer || !this.socket || !this.socket.connected) return;
      this.youTubePlayer.getCurrentTime().then(time => {
        this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
          status: this.playerStatus.status,
          currentTime: time
        });
      });
    },
    searchVideo(query = null, nextPageToken = null) {
      if (!this.youtubeSearch || this.youtubeSearch.length < 1) return;

      if (searchTimeout !== null) clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        this.showSearchLoading = true;
        let videoId = this.$youtube.getIdFromUrl(this.youtubeSearch);
        if (this.socket && this.socket.connected)
          if (!videoId) {
            this.socket.emit("getYtdInfo", this.youtubeSearch, data => {
              if (!data) return;
              let formats = data.formats.filter(video => {
                return video.protocol === "https";
              });
              let items = [
                {
                  media_source: "direct",
                  url: formats.reverse()[0].url,
                  title: data.title,
                  channel: data.uploader,
                  channel_url: this.youtubeSearch,
                  thumbnail: data.thumbnail,
                  youtube_id: "",
                  duration: data._duration_raw,
                  description: data.title,
                  source: "direct"
                }
              ];
              this.showSearchResults = true;
              this.showSearchLoading = false;
              return (this.searchResults = items.concat(this.searchResults));
            });
            testDirectSource(this.youtubeSearch).then(duration => {
              console.log(duration);
              let items = [
                {
                  media_source: "direct",
                  url: this.youtubeSearch,
                  title: "Direct Video",
                  channel: "Direct Video",
                  channel_url: "#",
                  thumbnail: "",
                  youtube_id: "",
                  duration,
                  description: "Direct Video",
                  source: "direct"
                }
              ];
              this.showSearchResults = true;
              this.showSearchLoading = false;
              return (this.searchResults = items.concat(this.searchResults));
            });
          }
        let url = new URL("https://www.googleapis.com/youtube/v3/search");
        let params = {
          key: settings.youTubeAPIKey,
          part: "snippet",
          type: "video",
          maxResults: 10,
          q: query ? query : this.youtubeSearch
        };
        if (nextPageToken) params.pageToken = nextPageToken;
        Object.keys(params).forEach(key =>
          url.searchParams.append(key, params[key])
        );
        fetch(url)
          .then(response => {
            if (response.status !== 200) {
              console.error("[YouTube] No video found");
            } else {
              response
                .json()
                .then(data => {
                  if (data.nextPageToken)
                    this.nextPageToken = data.nextPageToken;
                  if (!data || !data.items || data.items.length < 1)
                    return console.error("[YouTube] No video found");
                  this.showSearchLoading = false;
                  let items = [];
                  data.items.forEach(item => {
                    items.push({
                      media_source: "youtube",
                      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                      title: this.parseHtml(item.snippet.title),
                      channel: this.parseHtml(item.snippet.channelTitle),
                      channel_url: `https://www.youtube.com/channel/${item.snippet.channelId}`,
                      thumbnail: item.snippet.thumbnails.medium.url,
                      youtube_id: item.id.videoId,
                      duration: 0.0,
                      description: this.parseHtml(item.snippet.description),
                      source: "youtube"
                    });
                  });
                  if (nextPageToken) {
                    this.searchResults = this.searchResults.concat(items);
                  } else {
                    this.searchResults = items;
                  }
                  this.showSearchResults = true;
                  let videoIds = items.map(video => video.youtube_id);
                  this.getVideos(videoIds.join(","), "contentDetails")
                    .then(data => {
                      if (!data || !data.items || data.items.length < 1) return;
                      data.items.forEach(video => {
                        this.searchResults.forEach((vid, i) => {
                          if (vid.youtube_id === video.id) {
                            this.searchResults[
                              i
                            ].duration = iso8601duration.toSeconds(
                              iso8601duration.parse(
                                video.contentDetails.duration
                              )
                            );
                          }
                        });
                        this.$forceUpdate();
                      });
                    })
                    .catch(console.error);
                })
                .catch(console.error);
            }
          })
          .catch(error => {
            console.error(error);
            this.showSearchLoading = false;
          });
      }, 300);
    },
    parseHtml(string) {
      if (!string) return;
      const decodeElement = document.createElement("textarea");
      decodeElement.innerHTML = string;
      return decodeElement.value;
    },
    playlistSortEnd(event) {
      console.log("playlistSortEnd", event);
      if (event && event.type === "end") {
        if (event.item && event.item.getAttribute("uid")) {
          this.moveVideo(event.item.getAttribute("uid"), event.newIndex);
        }
      }
    },
    syncVideo(forceSend = false) {
      if (this.socket && this.socket.connected) {
        this.socket.emit("getPlayerStatus", this.roomID, true, forceSend);
      }
    },
    closeFullscreen() {
      if (document.fullscreen && document.exitFullscreen) {
        document.exitFullscreen();
      }
    },
    loadNext(isVisible) {
      if (!this.loadNextVisible && isVisible && this.nextPageToken) {
        this.searchVideo(null, this.nextPageToken);
      }
      this.loadNextVisible = isVisible;
    },
    sendMessage() {
      if (this.socket && this.socket.connected) {
        let msg = this.chatInput.substring(0, 500);
        if (msg.length < 1) return;
        this.socket.emit("message", this.roomID, msg);
        this.chatInput = "";
      }
    },
    toggleTheatre() {
      this.theatre = !this.theatre;
      this.videoPlayerHight = this.$refs.player.clientHeight + "px";
      setTimeout(() => {
        this.videoPlayerHight = this.$refs.player.clientHeight + "px";
      }, 500);
    },
    playerPaused() {
      if (this.queue.length < 1 || this.firstPlayerEvent) return;
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      let currentTime = this.directPlayer.currentTime;
      console.log("playerPaused", currentTime);

      this.playerStatus.status = "pause";
      if (this.roomID && this.socket) {
        this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
          status: "pause",
          currentTime
        });
      }
    },
    playerPlaying() {
      if (this.queue.length < 1 || this.firstPlayerEvent) return;
      if (this.preventPlayerEvents) return (this.preventPlayerEvents = false);
      let currentTime = this.directPlayer.currentTime;
      console.log("playerPlaying", currentTime);

      this.playerStatus.status = "play";
      if (this.roomID && this.socket) {
        this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
          status: "play",
          currentTime
        });
      }
    },
    playerSeeked() {
      if (this.queue.length < 1 || this.firstPlayerEvent) return;
      if (this.disableSeekEvent) return (this.disableSeekEvent = false);
      // if (false) this.preventPlayerEvents = true;
      let currentTime = this.directPlayer.currentTime;
      console.log("playerSeeked", currentTime);

      setTimeout(() => {
        if (this.directPlayer.paused) {
          this.playerStatus.status = "pause";
          if (this.roomID && this.socket) {
            this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
              status: "pause",
              currentTime
            });
          }
        }
      }, 10);
    },
    playerSeeking() {
      void 0;
    },
    playerEnded() {
      this.resetPlayers();
    },
    resetPlayers() {
      if (this.queue.length <= 1) {
        this.closeFullscreen();
      }

      this.playerData.videoSource = "";

      this.preventPlayerEvents = true;
      this.youTubePlayer.pauseVideo();
      this.disableSeekEvent = true;
      this.youTubePlayer.seekTo(0.0);
      this.playerData.videoId = "null";
      this.preventPlayerEvents = true;
      this.directPlayer.pause();
      this.disableSeekEvent = true;
      this.directPlayer.currentTime = 0.0;
      this.directPlayer.src = "";

      if (this.queue.length > 0) {
        if (this.socket && this.socket.connected)
          this.socket.emit("skipVideo", this.roomID);
      }
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

    fb.rooms
      .doc(this.roomID)
      .get()
      .then(querySnapshot => {
        this.loading = false;
        if (querySnapshot.exists) {
          this.roomData = querySnapshot.data();
          this.title = this.roomData.title;
          this.path = querySnapshot.id;
          this.isPublic = this.roomData.public;
          // load current room history
          roomHistory = this.userSettings.roomHistory;
          // remove current room from history
          roomHistory = roomHistory.filter(room => room.id !== this.roomID);
          // add current room to the beginning of history
          roomHistory.unshift({
            id: this.roomID,
            title: this.roomData.title
          });
          // keep room history <= 4
          if (roomHistory.length > 4) roomHistory.pop();
          // save room history in user settings
          this.userSettings.roomHistory = roomHistory;
          document.title = "Sync Video - " + this.roomData.title;
        } else {
          // remove current room from history
          roomHistory = this.userSettings.roomHistory;
          roomHistory = roomHistory.filter(room => room.id !== this.roomID);
          this.userSettings.roomHistory = roomHistory;
        }
      })
      .catch(e => {
        this.alertBox.send("error", e, 10000);
        this.loading = false;
      });
    fb.rooms.doc(this.roomID).onSnapshot(documentSnapshot => {
      this.roomData = documentSnapshot.data();
    });
    window.addEventListener("resize", () => {
      this.videoPlayerHight = this.$refs.player.clientHeight + "px";
      console.log(this.$refs.playerSize);
      this.$refs.directPlayer.height = this.$refs.playerSize.clientHeight;
    });
  }
};
</script>
