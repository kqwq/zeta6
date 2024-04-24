import { zeta6server } from "./server.js";
import { KAChat } from "./serverGames/ka-chat.js";

new KAChat();

new zeta6server(47777, KAChat.eventHandler);
