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

let gamedata = initializeJSON("gmgames.json");
let moves = parseMoves(gamedata[1].moves);
console.log(evaluatePieces(moves));