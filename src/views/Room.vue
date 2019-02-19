<template>
  <v-container>
    <v-layout>
      <p v-if="$route.params.id">Room: {{ $route.params.id }}</p>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      room: {
        id: this.params.id || null
      }
    };
  }
};
</script>
