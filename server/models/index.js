const mongoose = require('mongoose');
const { getCollection } = require('../services/jsonDb');

let useMongo = false;
let User, Bus, Route, Station;

function initModels(mongoConnected) {
  useMongo = mongoConnected;

  if (useMongo) {
    User = require('./user.model');
    Bus = require('./bus.model');
    Route = require('./route.model');
    Station = require('./station.model');
  }
}

async function findUser(query) {
  if (useMongo) return User.findOne(query).lean();
  const col = getCollection('users');
  return col.findOne(query);
}

async function findUsers(query) {
  if (useMongo) return User.find(query).lean();
  const col = getCollection('users');
  return col.find(query);
}

async function createUser(data) {
  if (useMongo) {
    const user = new User(data);
    return user.save().then(d => d.toObject());
  }
  const col = getCollection('users');
  return col.insertOne(data);
}

async function updateUser(query, data) {
  if (useMongo) return User.findOneAndUpdate(query, data, { new: true }).lean();
  const col = getCollection('users');
  return col.updateOne(query, data);
}

async function findBus(query) {
  if (useMongo) return Bus.findOne(query).lean();
  const col = getCollection('buses');
  return col.findOne(query);
}

async function findBuses(query = {}) {
  if (useMongo) return Bus.find(query).lean();
  const col = getCollection('buses');
  return col.find(query);
}

async function createBus(data) {
  if (useMongo) {
    const bus = new Bus(data);
    return bus.save().then(d => d.toObject());
  }
  const col = getCollection('buses');
  return col.insertOne(data);
}

async function updateBus(query, data) {
  if (useMongo) return Bus.findOneAndUpdate(query, data, { new: true }).lean();
  const col = getCollection('buses');
  return col.updateOne(query, data);
}

async function findRoute(query) {
  if (useMongo) return Route.findOne(query).lean();
  const col = getCollection('routes');
  return col.findOne(query);
}

async function findRoutes(query = {}) {
  if (useMongo) return Route.find(query).lean();
  const col = getCollection('routes');
  return col.find(query);
}

async function createRoute(data) {
  if (useMongo) {
    const route = new Route(data);
    return route.save().then(d => d.toObject());
  }
  const col = getCollection('routes');
  return col.insertOne(data);
}

async function findStation(query) {
  if (useMongo) return Station.findOne(query).lean();
  const col = getCollection('stations');
  return col.findOne(query);
}

async function findStations(query = {}) {
  if (useMongo) return Station.find(query).lean();
  const col = getCollection('stations');
  return col.find(query);
}

async function createStation(data) {
  if (useMongo) {
    const station = new Station(data);
    return station.save().then(d => d.toObject());
  }
  const col = getCollection('stations');
  return col.insertOne(data);
}

module.exports = {
  initModels,
  findUser, findUsers, createUser, updateUser,
  findBus, findBuses, createBus, updateBus,
  findRoute, findRoutes, createRoute,
  findStation, findStations, createStation,
};
