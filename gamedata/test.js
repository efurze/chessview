const fs = require('fs');


let initializeTrie = function(filename) {
  let trie = {
    d: [],      // data == array of gameIds
    c: {}       // named children e.g. {'e4': {trie}, 'd4': {trie}}
  };
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    trie = JSON.parse(data);
  } catch (e) {
    console.log("Trie file not read: " + e.toString());
  }
  return trie;
}

let descendentCount = function(root) {
  if (!root)
    return;

  let childCount = 0;
  let children = {};
  if ('c' in root) {
    children = root.c;
  } else {
    children = root;
  }

  let keys = Object.keys(children);
  if (keys.length == 0) {
    return 1;
  }

  keys.forEach(function(key) {
    childCount += descendentCount(children[key]);
  });
  return childCount;
}


let trie = initializeTrie("trie.json");
let c4lines = trie.c['c4'];
trie = {
  c: {'c4': c4lines}
};
console.log(JSON.stringify(trie));