import { zeta6server } from "./server.js";
import { KAChat } from "./serverGames/ka-chat.js";

new KAChat();

const eh = KAChat.eventHandler;

new zeta6server(47777, eh);
