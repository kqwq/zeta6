import { zeta6server } from "./server.js";
import { KAChat } from "./serverGames/ka-chat.js";

const game = new KAChat();

new zeta6server(47777, game.eventHandler);
