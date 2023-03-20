import { createClient } from 'redis';
import {keys } from './keys.js';

const redisClient = createClient({
  url: 'redis://redis:6379',
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

await redisClient.connect();

const subscriber = redisClient.duplicate();
await subscriber.connect();
redisClient.on('error', err => console.log('Redis Client Error', err));

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}


await subscriber.subscribe('insert', (message) => {
  console.log("message => ", message); // 'message'
  redisClient.hSet('values', message, fib(parseInt(message)));
});

