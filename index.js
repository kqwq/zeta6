import { zeta6server } from "./server.js";

new KAChat();

new zeta6server(47777, KAChat.eventHandler);
