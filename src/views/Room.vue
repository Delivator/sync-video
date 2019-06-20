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
                  class="headline"
                  :class="socket.connected ? pingColor : 'red--text'"
                >&nbsp;●</h5>
              </template>
              <span>{{socket && socket.connected ? `Ping: ${ping}ms` : 'No connection to server'}}</span>
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
                <br>Shift+Click to sync all clients
              </span>
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
              <v-container v-if="queue.length < 1" fluid fill-height>
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
            <v-toolbar-title>Users</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-progress-circular color="primary" indeterminate v-if="!socket.connected"></v-progress-circular>
            <div v-else-if="users && users.length > 0" class="user-list" @wheel="scrollUserList">
              <v-chip
                v-for="user in users"
                :key="user.displayName"
                :class="user.isMe ? 'primary white--text' : ''"
              >
                <v-avatar v-if="user.avatar">
                  <img :src="user.avatar" alt="Avatar">
                </v-avatar>
                {{user.displayName}}
              </v-chip>
            </div>
            <div v-else>
              <p class="subheading">No users connected</p>
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
            <v-toolbar-title>Playlist{{queue.length > 0 ? ` (${queue.length}): ${queue[0].title}` : ""}}</v-toolbar-title>
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
                      >list</v-icon>
                    </template>
                    Back to playlist view
                  </v-tooltip>
                </template>
                <v-icon color="success" slot="append" @click="addVideo">search</v-icon>
              </v-text-field>
              <input type="submit" class="hide">
            </v-form>
            <div
              v-show="queue.length > 0 || showSearchResults"
              @mouseenter="searchHover = true"
              @mouseleave="searchHover = false"
            >
              <h6 class="title" v-if="showSearchResults">Search results:</h6>
              <v-list two-line v-show="showSearchResults">
                <v-list-tile
                  v-for="video in searchResults"
                  two-line
                  :key="video.id"
                  :class="userSettings.darkMode ? 'queue-item-dark' : 'queue-item'"
                >
                  <img
                    :src="video.thumbnails.medium.url"
                    height="50"
                    width="88.889"
                    class="playlist-thumbnail"
                  >
                  <v-list-tile-content>
                    <v-list-tile-title>
                      <a
                        :class="`no-link-deko ${userSettings.darkMode ? 'white--text' : 'black--text'}`"
                        :href="video.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{parseYoutubeTitle(video.title)}}
                        <v-icon small>open_in_new</v-icon>
                      </a>
                    </v-list-tile-title>
                    <v-list-tile-sub-title>
                      <span class="text--primary">
                        <a
                          :href="video.channel.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          :class="`no-link-deko ${userSettings.darkMode ? 'white--text' : 'black--text'}`"
                        >{{parseYoutubeTitle(video.channel.title)}}</a>
                      </span>
                      &mdash; {{video.description}}
                    </v-list-tile-sub-title>
                  </v-list-tile-content>
                  <v-list-tile-action>
                    <v-btn
                      icon
                      ripple
                      @click="addVideo($event, video.id, parseYoutubeTitle(video.title), video.channel.title, video.description)"
                      class="playlist-add-button"
                    >
                      <v-icon class="playlist-add-icon">playlist_add</v-icon>
                    </v-btn>
                  </v-list-tile-action>
                </v-list-tile>
              </v-list>
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
                      >
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
                        </v-list-tile-title>
                        <v-list-tile-sub-title>
                          <span class="text--primary">
                            {{parseYoutubeTitle(video.source)}}
                          </span>
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
              </v-list>
            </div>
            <div v-show="queue.length < 1 && !showSearchResults">
              <v-container>
                <v-layout row wrap>
                  <v-flex xs12>
                    <h6 class="title">No videos in queue</h6>
                  </v-flex>
                </v-layout>
              </v-container>
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
    <v-alert type="info" dismissible v-model="showAlert">Video {{ videoTitle }} added</v-alert>
  </v-container>
</template>

<style>
@import "../assets/css/style.css";
</style>

<script>
import YouTube from "simple-youtube-api";
import settings from "../settings.json";
import draggable from "vuedraggable";

const youtube = new YouTube(settings.youTubeAPIKey);
let searchTimeout = null;

export default {
  components: {
    draggable
  },
  props: ["alertBox", "currentUser", "socket", "userSettings", "db"],
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
      preventYouTubeSeekEvent: true,
      firstPlayerEvent: true,
      youtubeSearch: "",
      queue: [],
      loading: true,
      searchResults: [],
      showSearchResults: false,
      searchHover: false,
      playerStatus: { status: "play" },
      ping: 0,
      pingColor: "grey--text",
      rules: {
        required: value => !!value || "Required.",
        title: value => 1 < value.length < 65 || "1-64 Characters"
      },
      videoTitle: "",
      showAlert: false
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
      this.dialog = false;
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
        if (this.socket && this.socket.connected)
          this.socket.emit("getPlayerStatus", this.roomID);
      }, 1500);

      // Custom seek "event" because the youtube embed player
      // doesn't have a "seeked" event
      setInterval(() => {
        // check every 75ms if the player is offset
        // by -0.5s or +0.5s
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
            if (this.socket.connected) {
              this.socket.emit("joinRoom", this.roomID);
              this.socket.emit("getQueue", this.roomID);
            }
            this.socket.on("reconnect", () => {
              setTimeout(() => {
                this.socket.emit("joinRoom", this.roomID);
                if (this.currentUser && this.socket.connected) {
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
              if (playerStatus && playerStatus.status)
                this.playerStatus = playerStatus;
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
                  })
                  .catch(console.error);
                this.preventYouTubeSeekEvent = true;
                this.youTubePlayer.seekTo(playerStatus.currentTime);
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
                      this.preventYouTubeSeekEvent = true;
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
            });
            this.socket.on("updateQueue", queue => {
              if (queue) this.queue = queue;
              if (queue && queue.length > 0) {
                this.playerData.videoSource = queue[0].videoSource || "";
                this.playerData.videoId = queue[0].videoId || "null";
              } else {
                // when the queue is empty
                this.playerData.videoSource = "";
                this.playerData.videoId = "null";
              }
            });
            this.socket.on("pong", ping => {
              this.ping = ping;

              if (ping < 50) {
                this.pingColor = "green--text";
              } else if (ping < 100) {
                this.pingColor = "lime--text";
              } else if (ping < 150) {
                this.pingColor = "yellow--text text--darken-3";
              } else if (ping > 200) {
                this.pingColor = "orange--text text--darken-3";
              }
            });
          }
        }, 0);
      }
    },
    onPlay() {
      if (this.queue.length < 1) return;

      if (this.firstPlayerEvent && this.socket && this.socket.connected) {
        this.firstPlayerEvent = false;
        this.socket.emit("getPlayerStatus", this.roomID);
        return;
      }

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
    onPause() {
      if (this.queue.length < 1) return;

      if (this.firstPlayerEvent && this.socket && this.socket.connected) {
        this.firstPlayerEvent = false;
        this.socket.emit("getPlayerStatus", this.roomID);
        return;
      }

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
    onEnded() {
      this.preventYouTubeSeekEvent = true;
      this.youTubePlayer.seekTo(0.0);

      if (this.queue.length > 0) {
        this.preventPlayerEvents = true;
        if (this.socket && this.socket.connected)
          this.socket.emit("skipVideo", this.roomID);
      }
      if (this.queue.length <= 1) {
        document.exitFullscreen();
      }
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
    addVideo(event, videoId, title, source = "", description = "") {
      if (event && event.type === "submit") event.preventDefault();
      if (!videoId) videoId = this.$youtube.getIdFromUrl(this.youtubeSearch);
      if (!videoId) return;

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

      const sendUpdate = () => {
        if (this.socket && this.socket.connected) {
          let options = {
            videoSource: "youtube",
            videoId: videoId,
            title,
            source,
            description
          };

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

      if (title) {
        // max title, source, description length
        title = String(title).substring(0, 100);
        source = String(source).substring(0, 100);
        description = String(description).substring(0, 250);
        sendUpdate();
      } else {
        title = "YouTube Video";
        youtube
          .getVideoByID(videoId)
          .then(video => {
            if (!video) return console.error("[YouTube] No video found");
            title = this.parseYoutubeTitle(video.title);
            source = video.channel.title.substring(0, 100);
            description = video.description.substring(0, 250);
            sendUpdate();
          })
          .catch(error => {
            console.error(error);
            sendUpdate();
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
    youtubeOnError(e) {
      if (e) console.log("youtubeOnError", e);
    },
    onSeek() {
      if (this.preventYouTubeSeekEvent)
        return (this.preventYouTubeSeekEvent = false);
      if (!this.youTubePlayer || !this.socket || !this.socket.connected) return;
      this.youTubePlayer.getCurrentTime().then(time => {
        this.socket.emit("sendPlayerStatusUpdate", this.roomID, {
          status: this.playerStatus.status,
          currentTime: time
        });
      });
    },
    searchVideo() {
      if (!this.youtubeSearch || this.youtubeSearch.length < 1) return;

      if (searchTimeout !== null) clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        youtube
          .searchVideos(this.youtubeSearch, 10)
          .then(results => {
            if (!results || results.length < 1)
              return console.error("[YouTube] No video found");
            // Remove livestreams from search results
            results = results.filter(
              video => video.raw.snippet.liveBroadcastContent === "none"
            );
            this.searchResults = results;
            this.showSearchResults = this.searchResults.length > 0;
          })
          .catch(console.error);
      }, 400);
    },
    parseYoutubeTitle(title) {
      if (!title) return;
      const parser = new DOMParser();
      return parser.parseFromString(
        "<!doctype HTML><body>" + title,
        "text/html"
      ).body.textContent;
    },
    playlistSortEnd(event) {
      if (event && event.type === "end") {
        if (
          event.item &&
          event.item.firstChild &&
          event.item.firstChild.getAttribute("uid")
        ) {
          this.moveVideo(
            event.item.firstChild.getAttribute("uid"),
            event.newIndex
          );
        }
      }
    },
    syncVideo(forceSend = false) {
      if (this.socket && this.socket.connected) {
        this.socket.emit("getPlayerStatus", this.roomID, true, forceSend);
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
            // load current room history
            roomHistory = this.userSettings.roomHistory;
            // remove current room from history
            roomHistory = roomHistory.filter(room => room.id !== this.roomID);
            // add current room to the beginning of history
            roomHistory.unshift({
              id: this.roomID,
              title: this.roomData.title
            });
            // keep room history < 6
            if (roomHistory.length > 5) roomHistory.pop();
            // save room history in user settings
            this.userSettings.roomHistory = roomHistory;
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