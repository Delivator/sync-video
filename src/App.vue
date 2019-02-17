<template>
  <v-app dark>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>SYNC-VIDEO</span>
        <span class="font-weight-light">.ME</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn raised href="/login" >
        <span class="mr-2">Login</span>
        <v-icon>input</v-icon>
      </v-btn>
    </v-toolbar>

    <v-content>
      <router-view/>
    </v-content>
  </v-app>
</template>

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
