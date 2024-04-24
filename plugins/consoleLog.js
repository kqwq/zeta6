

export class ConsoleLogPlugin {
  onEvent(type, data, peer, peers) {
    console.log(`[${type}] ${data}`);
  }
}