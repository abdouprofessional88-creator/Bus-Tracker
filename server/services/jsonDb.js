const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');

class JsonCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this._ensureFile();
  }

  _ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
    }
  }

  _read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  async find(query = {}) {
    let items = this._read();
    const keys = Object.keys(query);
    if (keys.length > 0) {
      items = items.filter(item =>
        keys.every(k => {
          if (typeof query[k] === 'object' && query[k] !== null && !Array.isArray(query[k])) {
            const nestedKeys = Object.keys(query[k]);
            return nestedKeys.every(nk => {
              if (nk === '$regex') return new RegExp(query[k][nk], 'i').test(item[k]);
              if (nk === '$gt') return item[k] > query[k][nk];
              if (nk === '$gte') return item[k] >= query[k][nk];
              if (nk === '$lt') return item[k] < query[k][nk];
              if (nk === '$lte') return item[k] <= query[k][nk];
              return item[k] && item[k][nk] === query[k][nk];
            });
          }
          if (Array.isArray(query[k])) {
            return query[k].includes(item[k]);
          }
          if (query[k] === null || query[k] === undefined) {
            return item[k] === query[k];
          }
          return item[k] === query[k];
        })
      );
    }
    return this._clone(items);
  }

  async findById(id) {
    const items = this._read();
    const item = items.find(i => i._id === id || i.id === id);
    return item ? this._clone(item) : null;
  }

  async findOne(query) {
    const items = await this.find(query);
    return items.length > 0 ? items[0] : null;
  }

  async insertOne(doc) {
    const items = this._read();
    const newDoc = { _id: uuidv4(), ...doc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    items.push(newDoc);
    this._write(items);
    return this._clone(newDoc);
  }

  async updateOne(query, update) {
    const items = this._read();
    const keys = Object.keys(query);
    const idx = items.findIndex(item =>
      keys.every(k => item[k] === query[k])
    );
    if (idx === -1) return null;
    if (update.$set) {
      Object.assign(items[idx], update.$set);
    } else {
      Object.assign(items[idx], update);
    }
    items[idx].updatedAt = new Date().toISOString();
    this._write(items);
    return this._clone(items[idx]);
  }

  async updateMany(query, update) {
    const items = this._read();
    const keys = Object.keys(query);
    let count = 0;
    items.forEach((item, idx) => {
      if (keys.every(k => item[k] === query[k])) {
        if (update.$set) {
          Object.assign(items[idx], update.$set);
        } else {
          Object.assign(items[idx], update);
        }
        items[idx].updatedAt = new Date().toISOString();
        count++;
      }
    });
    this._write(items);
    return { modifiedCount: count };
  }

  async deleteOne(query) {
    const items = this._read();
    const keys = Object.keys(query);
    const idx = items.findIndex(item =>
      keys.every(k => item[k] === query[k])
    );
    if (idx === -1) return { deletedCount: 0 };
    items.splice(idx, 1);
    this._write(items);
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    const items = await this.find(query);
    return items.length;
  }
}

const collections = {};

function getCollection(name) {
  if (!collections[name]) {
    collections[name] = new JsonCollection(name);
  }
  return collections[name];
}

module.exports = { getCollection, JsonCollection };
