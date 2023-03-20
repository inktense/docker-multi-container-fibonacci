//const keys = require("./keys");
import { keys } from './keys.js'

// Express App Setup
//const express = require("express");
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
//import pkg from 'pg';
import pkg from 'pg';
//console.log(pkg)
const { Pool } = pkg
import { createClient } from 'redis';
// const bodyParser = require("body-parser");
// const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Redis Client Setup
//const redis = require("redis");
  const redisClient = createClient({
    url: 'redis://redis:6379',
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000,
  });
  
  await redisClient.connect();

  redisClient.on('error', err => console.log('Redis Client Error', err));


// Postgres Client Setup
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});


const redisPublisher = redisClient.duplicate();
await redisPublisher.connect();

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values");
  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  const values = await redisClient.hGetAll("values");
  console.log("values => ", values)
  res.send(values);
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  await redisClient.hSet("values", index, "Nothing yet!");
  await redisPublisher.publish("insert", index);

  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

  res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening on port 5000");
});
