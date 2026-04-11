import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: "./config/.env" });

const sanitizeEnvValue = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.trim().replace(/^['\"]|['\"]$/g, "");
};

const redisUrl = sanitizeEnvValue(process.env.REDIS_URL);

if (!redisUrl) {
  throw new Error("REDIS_URL is not set. Add REDIS_URL to config/.env before starting API/worker.");
}

export const bullRedisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(retries) {
    const delay = Math.min(retries * 1000, 10000);
    console.warn(JSON.stringify({
      level: "warn",
      service: "bull-redis",
      event: "reconnecting",
      retries,
      delay,
      timestamp: new Date().toISOString(),
    }));
    return delay;
  },
  reconnectOnError(error) {
    console.error(JSON.stringify({
      level: "error",
      service: "bull-redis",
      event: "reconnect_on_error",
      message: error.message,
      timestamp: new Date().toISOString(),
    }));
    return true;
  },
});

bullRedisConnection.on("connect", () => {
  console.log(JSON.stringify({
    level: "info",
    service: "bull-redis",
    event: "connected",
    timestamp: new Date().toISOString(),
  }));
});

bullRedisConnection.on("ready", () => {
  console.log(JSON.stringify({
    level: "info",
    service: "bull-redis",
    event: "ready",
    timestamp: new Date().toISOString(),
  }));
});

bullRedisConnection.on("error", (error) => {
  console.error(JSON.stringify({
    level: "error",
    service: "bull-redis",
    event: "error",
    message: error.message,
    timestamp: new Date().toISOString(),
  }));
});

bullRedisConnection.on("close", () => {
  console.warn(JSON.stringify({
    level: "warn",
    service: "bull-redis",
    event: "closed",
    timestamp: new Date().toISOString(),
  }));
});

bullRedisConnection.on("reconnecting", (timeUntilReconnect: number) => {
  console.warn(JSON.stringify({
    level: "warn",
    service: "bull-redis",
    event: "reconnecting",
    timeUntilReconnect,
    timestamp: new Date().toISOString(),
  }));
});

export async function connectBullRedis(): Promise<void> {
  if (bullRedisConnection.status === "wait" || bullRedisConnection.status === "end") {
    await bullRedisConnection.connect();
  }
}

export async function closeBullRedis(): Promise<void> {
  if (bullRedisConnection.status !== "end") {
    await bullRedisConnection.quit();
  }
}
