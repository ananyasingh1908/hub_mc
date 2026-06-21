declare module "rcon" {
  import { EventEmitter } from "events";
  class Rcon extends EventEmitter {
    constructor(host: string, port: number, password: string);
    connect(): void;
    disconnect(): void;
    send(command: string): void;
    on(event: "auth", listener: () => void): this;
    on(event: "response", listener: (response: string) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
  }
  export = Rcon;
}
