import "server-only";
import { Client as PostgresClient } from "pg";
import { Client as SSHClient } from "ssh2";
import type { ClientChannel } from "ssh2";

export function databaseConfigured() {
  return Boolean(process.env.LUMA_DB_PASSWORD && process.env.LUMA_SSH_PRIVATE_KEY);
}

export async function withDatabase<T>(operation: (client: PostgresClient) => Promise<T>): Promise<T> {
  const hostHash = process.env.LUMA_SSH_HOST_KEY_SHA256;
  if (!databaseConfigured() || !hostHash || !/^[a-f0-9]{64}$/.test(hostHash)) throw new Error("Database connection is not configured.");
  const ssh = new SSHClient();
  let postgres: PostgresClient | undefined;
  let connected = false;
  try {
    const stream = await new Promise<ClientChannel>((resolve, reject) => {
      ssh.on("error", reject);
      ssh.on("ready", () => ssh.forwardOut("127.0.0.1", 0, "127.0.0.1", 5432, (error, channel) => error ? reject(error) : resolve(channel)));
      ssh.connect({
        host: process.env.LUMA_SSH_HOST,
        port: 22,
        username: "luma-tunnel",
        privateKey: Buffer.from(process.env.LUMA_SSH_PRIVATE_KEY!, "base64"),
        hostHash: "sha256",
        hostVerifier: (hash: string) => hash === hostHash,
        readyTimeout: 10000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 1,
        algorithms: { serverHostKey: ["ssh-ed25519"] },
      });
    });
    // node-postgres expects a socket that emits connect after its listeners attach.
    // The SSH channel is already open, so adapt its socket lifecycle locally.
    const socket = Object.assign(stream, {
      setNoDelay: () => socket,
      setKeepAlive: () => socket,
      connect: () => { queueMicrotask(() => socket.emit("connect")); return socket; },
    });
    postgres = new PostgresClient({
      host: "127.0.0.1", port: 5432,
      database: "luma", user: "luma_app",
      password: process.env.LUMA_DB_PASSWORD,
      stream: () => socket,
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
      application_name: "luma-vercel",
    });
    postgres.on("error", () => { /* Queries surface connection failures to the caller. */ });
    await postgres.connect();
    connected = true;
    return await operation(postgres);
  } finally {
    if (postgres && connected) await postgres.end().catch(() => {});
    ssh.destroy();
  }
}
