<template>
  <v-container fluid fill-height>
    <v-layout align-center justify-center>
      <v-flex xs12 sm8 md4>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form>
              <v-text-field
                :rules="[rules.required]"
                prepend-icon="alternate_email"
                name="email"
                label="Email"
                :type="email"
              ></v-text-field>
              <v-text-field
                prepend-icon="lock"
                :append-icon="show1 ? 'visibility_off' : 'visibility'"
                :rules="[rules.required, rules.min]"
                :type="show1 ? 'text' : 'password'"
                name="input-10-1"
                label="Password"
                hint="At least 6 characters"
                counter
                @click:append="show1 = !show1"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/sign-up">Sign Up</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="error">Reset Password</v-btn>
            <v-btn color="primary">Login</v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      drawer: null,
      props: {
        source: String
      },
      show1: false,
      password: "Password",
      rules: {
        required: value => !!value || "Required.",
        min: v => v.length >= 6 || "Min 6 characters"
      }
    };
  }
};
</script>