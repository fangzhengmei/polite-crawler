const fs = require('fs');
const path = require('path');

class PersistenceStore {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.successfulUrls = new Set();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const urls = JSON.parse(data);
        this.successfulUrls = new Set(urls);
      }
    } catch (error) {
      console.error('Error loading persistent store:', error);
      this.successfulUrls = new Set();
    }
  }

  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.successfulUrls), null, 2);
      fs.writeFileSync(this.storagePath, data, 'utf8');
    } catch (error) {
      console.error('Error saving persistent store:', error);
    }
  }

  add(url) {
    this.successfulUrls.add(url);
    this.save();
  }

  has(url) {
    return this.successfulUrls.has(url);
  }

  getAll() {
    return Array.from(this.successfulUrls);
  }

  clear() {
    this.successfulUrls.clear();
    this.save();
  }

  size() {
    return this.successfulUrls.size;
  }
}

module.exports = PersistenceStore;
