import { createApp } from "vue";

import App from "@/app/App.vue";
import { router } from "@/app/router";
import { pinia } from "@/app/providers/pinia";
import "@/app/pwa";
import "@/app/styles/base.css";

const app = createApp(App);

app.use(pinia);
app.use(router);
app.mount("#app");
