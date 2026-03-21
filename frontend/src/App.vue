<template>
  <AppShell v-if="auth.isLoggedIn" />
  <RouterView v-else />
</template>

<script setup>
import AppShell from "./components/AppShell.vue";
import { auth } from "./auth.js";
</script>
