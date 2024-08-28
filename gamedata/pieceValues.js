const fs = require('fs');
const {Chess} = require('./chess.js');

let initializeJSON = function(filename) {
  let obj = {}
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    obj = JSON.parse(data);
  } catch (e) {
    console.log("JSON file not read: " + e.toString());
  }
  return obj;
}

let parseMoves = function(line) { // "1. d4 Nf6 2. c4 g6 3. Nc3 ...""
	let moves = [];
  	let turns = line.split(/\d+\. /); //['e4 e5 ', 'Nf3 Nc6' ...]
  	turns.forEach(function(turn) {
    	turn = turn.trim();
    	if (!turn.length) {
    	  return;
    	}
    	// 'e4 e5 ' 
    	let halfmoves = turn.split(' ');
    	//console.log(halfmoves);
    
    	// NOTE: the last half-move for black will be "1-0", "0-1", or "1/2-1/2" if the game ended on white's move
    	// chess.move() will throw an exception if the move isn't well-formed
    	//chess.move(halfmoves[0]);
    	moves.push(halfmoves[0]);

    	if (halfmoves[1] !== "1-0" && halfmoves[1] !== "0-1" && halfmoves[1] !== "1/2-1/2" && halfmoves[1] !== "*") {
      		//chess.move(halfmoves[1]);
    		moves.push(halfmoves[1]);
    	}
  	}); // forEach(turn)

  	return moves;
}

/*
	returns {
		w: [{square: 'a1', type: 'r', color: 'w'}, {square: 'b1', type: 'n', color: 'w'}, ...],
		b: [{square: 'a8', type: 'r', color: 'b'}, {square: 'b8', type: 'n', color: 'b'}, ...]
	}
*/
let getPieces = function(chess) {
	const board = chess.board(); // [[{square: 'a8', type: 'r', color: 'b'}, {square: 'b8', type: 'n', color: 'b'}, ... ]]
	const ret = {w:[], b:[]};

	board.forEach(function(rank) {
		rank.forEach(function(square) {
			if (square == null) {
				return;
			} else {
				ret[square.color].push(square);
			} 
		})
	})

	return ret;
}

let squaresControlledByPiece = function(square, fen) {
	const chess = new Chess(fen);
	const allpieces = getPieces(chess);
	const pieces = chess.turn() == 'b' ? allpieces.b : allpieces.w;
	const othercolor = chess.turn() == 'b' ? 'w' : 'b';

	// replace every other piece with a knight from the other color
	pieces.forEach(function(piece) {
		if (piece.square !== square) {
			chess.put({type: 'n', color: othercolor}, piece.square);
		}
	})

	const moves = chess.moves({square: square});
	return moves.length;
}

/*
	returns list with number of squares attacked by each piece for the side whose turn it is:
	{'q': 9, 'r': 5 ...}
*/
let squaresControlled = function(chess) {
	const ret = {};
	const allpieces = getPieces(chess);
	const pieces = chess.turn() == 'b' ? allpieces.b : allpieces.w; 

	pieces.forEach(function(piece) {
		if (piece.type == 'p' || piece.type == 'k') {
			return;
		}

		let count = squaresControlledByPiece(piece.square, chess.fen());

		if (piece.type in ret) {
			count = (ret[piece.type] + count)/2;
		}

		ret[piece.type] = count;
	})

	return ret;
}

/*
	returns array of objects for each move:
	 [	{ r: 2, n: 3, b: 2, q: 5 },
  		{ r: 2, n: 3, b: 2, q: 5 },
  		...
  	]

  	where the object at index N is a map from piece to # of squares controlled by that piece at that move
*/
let evaluatePieces = function(moves) {
	const chess = new Chess();
	const ret = [];
	ret.push(squaresControlled(chess));
	moves.forEach(function(move) {
		chess.move(move);
		ret.push(squaresControlled(chess));
	})
	return ret;
}

/*
	averages and results are both objects which map piece to count of squares controlled:
	e.g. { r: 2, n: 3, b: 2, q: 5 }
*/
let updateAverage = function(averages, results, gamecount) {
	//console.log("averages", averages);
	//console.log("update", results);
	Object.keys(results).forEach(function(piece) {
		if (!(piece in averages)){
			averages[piece] = 0;
		}

		if (results[piece] < 1) {
			results[piece] = average[piece];
		}
		
		//console.log("avg[piece]", averages[piece], "gamecount", gamecount, "results[piece]", results[piece]);
		averages[piece] = Math.round(10*(averages[piece] * gamecount + results[piece])/(gamecount + 1))/10;
	})
	//console.log("averages", averages);
}

/*
	We determine the 'average number of squares controlled' for each piece for every move of every game.

	returns: array of objects for each move e.g.
	[
		{ r: 2, n: 3, b: 2, q: 5 },
		{ r: 2, n: 3, b: 2, q: 5 },
		{ r: 2, n: 3, b: 2, q: 5 }, // value for each piece for the second move averaged over every game
		...
	]

*/
let processGames = function(games) {
	const gameids = Object.keys(games);
	const averages = [];
	for (let i=0; i<10000; i++) {
		const moves = parseMoves(games[gameids[i]].moves);	
		const results = evaluatePieces(moves);

		results.forEach(function(move, idx) { // { r: 2, n: 3, b: 2, q: 5 }
			if (!averages[idx]) {
				averages[idx] = { r: 0, n: 0, b: 0, q: 0 };
			}
			updateAverage(averages[idx], move, i);
		})
		console.log("game " + (i+1));
	}

	saveObject(averages, "piecevalues.json");
}


let saveObject = function(obj, filename) {
  try {
    const json = JSON.stringify(obj);	
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.log(e);
  }
}

/*
	Load a trie of all moves played in a collection of games. We expect the data to be a JSON file of the form
	{
		c:{
			'e4' : {'e5': {}, ...},
			'd4' : {'nf3 : {}, '}
		},
		d: [1004, 3005]  // gameIds of all games that terminated at a given node
	}
*/

let gamedata = initializeJSON("gmgames.json");
processGames(gamedata);

//console.log(evaluatePieces(moves));