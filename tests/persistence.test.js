const fs = require('fs');
const path = require('path');
const PersistenceStore = require('../src/persistence');

describe('PersistenceStore', () => {
  const testDir = path.join(__dirname, 'test-data');
  const testFile = path.join(testDir, 'test-urls.json');

  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(testDir)) {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      fs.rmdirSync(testDir);
    }
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (fs.existsSync(testDir)) {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      fs.rmdirSync(testDir);
    }
  });

  test('should initialize with empty set when no file exists', () => {
    const store = new PersistenceStore(testFile);
    
    expect(store.size()).toBe(0);
    expect(store.getAll()).toEqual([]);
  });

  test('should add and retrieve URLs correctly', () => {
    const store = new PersistenceStore(testFile);
    const testUrls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3'
    ];
    
    testUrls.forEach(url => store.add(url));
    
    expect(store.size()).toBe(3);
    testUrls.forEach(url => expect(store.has(url)).toBe(true));
    expect(store.getAll()).toEqual(expect.arrayContaining(testUrls));
  });

  test('should persist URLs to file', () => {
    const store1 = new PersistenceStore(testFile);
    const testUrls = [
      'https://example.com/page1',
      'https://example.com/page2'
    ];
    
    testUrls.forEach(url => store1.add(url));
    
    // Create a new store instance to test persistence
    const store2 = new PersistenceStore(testFile);
    
    expect(store2.size()).toBe(2);
    testUrls.forEach(url => expect(store2.has(url)).toBe(true));
  });

  test('should handle duplicate URLs correctly', () => {
    const store = new PersistenceStore(testFile);
    const testUrl = 'https://example.com/page1';
    
    store.add(testUrl);
    store.add(testUrl); // Add same URL again
    store.add(testUrl); // And again
    
    expect(store.size()).toBe(1);
    expect(store.has(testUrl)).toBe(true);
  });

  test('should clear all URLs correctly', () => {
    const store = new PersistenceStore(testFile);
    const testUrls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3'
    ];
    
    testUrls.forEach(url => store.add(url));
    expect(store.size()).toBe(3);
    
    store.clear();
    expect(store.size()).toBe(0);
    testUrls.forEach(url => expect(store.has(url)).toBe(false));
  });

  test('should return false for non-existent URLs', () => {
    const store = new PersistenceStore(testFile);
    const testUrl = 'https://example.com/page1';
    
    expect(store.has(testUrl)).toBe(false);
    
    store.add(testUrl);
    expect(store.has(testUrl)).toBe(true);
  });

  test('should handle empty storage path gracefully', () => {
    // This test just ensures no errors are thrown
    const store = new PersistenceStore(testFile);
    expect(store.size()).toBe(0);
  });
});
