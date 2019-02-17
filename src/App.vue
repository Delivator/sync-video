<template>
  <v-app dark>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <router-link to="/" class="white--text">
          <span>SYNC-VIDEO</span>
          <span class="font-weight-light">.ME</span>
        </router-link>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn raised to="/login" >
        <span class="mr-2">Login</span>
        <v-icon>input</v-icon>
      </v-btn>
    </v-toolbar>

    <v-content>
      <router-view/>
    </v-content>
  </v-app>
</template>

<style>
  @import "assets/css/style.css";
</style>

<script>
export default {
  name: 'App',
  data () {
    return {
      //
    }
  }
}
</script>
