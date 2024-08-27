

export function MoveTrie() {
	this._trie = {c:{}, freq: 1};
}

MoveTrie.prototype.init = function(trieData) {
	this._trie = trieData;
	this._decorate(this._trie);
}

// adds 'freq' property to every node with # of descendents 
MoveTrie.prototype._decorate = function(root) {
  if (!root) {
    return;
  }

  const self = this;
  let descendentcount = 0;
  let childcounts = {};
  let children = root.c;
  let keys = Object.keys(children);

  keys.forEach(function(key) {
    let count = self._decorate(children[key]);
    childcounts[key] = count;
    descendentcount += count;
  });

  keys.forEach(function(key) {
    children[key].freq = childcounts[key]/descendentcount;
  });

  return descendentcount + 1;
}

// moves = ['e4', 'e5', 'd4', 'd5', ...]
MoveTrie.prototype.getFreq = function(moves) {
	if(!this._trie || !this._trie.c) {
		return;
	}

	const self = this;

	let node = self._trie;
	moves.forEach(function(move) {
		if (node && move in node.c) {
			node = node.c[move];
		} else {
			node = null;
		}
	});

	return node ? node.freq : 0;
}

/*
	returns: {
		c: {'e4': {freq:0.4, c: {}}, 'd4': {freq:0.3, c: {}}, ... }
	}
*/
MoveTrie.prototype.getTopLinesFrom = function(node, branching=1) {
	const self = this;
	const ret = {c:{}};
	let nextmoves = self.enumerateMoves(node); // [['nf3', 0.8],['nc3', 0.1],...]
	nextmoves.sort((a,b)=> b[1] - a[1]);
	nextmoves = nextmoves.slice(0, branching);
	nextmoves.forEach(function(move) { // ['nf3', 0.8]
		let child = self.getTopLinesFrom(node.c[move[0]], branching);
		child.freq = move[1];
		ret.c[move[[0]]] = child;
	})
	return ret;
}

/* moves = ['e4', 'e5', 'd4', 'd5', ...] == history for current position
   returns: [
	['nf3', 0.8],
	['nc3', 0.1],
	...
   ]
*/
MoveTrie.prototype.enumerateMoves = function(node) {
	const ret = [];
	if(node){ 
		Object.keys(node.c).forEach(function(key){
			ret.push([key, node.c[key].freq]);
		});
	};

	return ret;
}

MoveTrie.prototype.getNodeAt = function(moves) {
	if(!this._trie || !this._trie.c) {
		return {};
	}
	const self = this;

	let node = self._trie;
	moves.forEach(function(move) {
		if (node && move in node.c) {
			node = node.c[move];
		} else {
			node = null;
		}
	});

	return node;
}