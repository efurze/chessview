import { Chess } from '/public/js/third_party/chess.js'


export function Lineview(chessboard) {
	this._chessboard = chessboard;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];


Lineview.prototype.drawAttackedByWhite = function(fen) {
	const self = this;
	FILES.forEach(function(file) {
		for (let rank=1; rank<9; rank++) {
			const whiteAttackers = self.attackersOfSquare(file, rank, fen, 'w'); // returns array of squares that attack
			//const blackAttackers = self.attackersOfSquare(file, rank, fen, 'b');
			const net = whiteAttackers.length; // - blackAttackers.length; 
			if (net > 0) {
				self._chessboard.changeSquareColor(file, rank, 'blue', net * 0.2);
			} else if (net < 0) {
				self._chessboard.changeSquareColor(file, rank, 'red', Math.abs(net) * 0.2);
			}
		}
	});
};


// returns array of squares that attack
Lineview.prototype.attackersOfSquare = function(file, rank, fen, attacker_color /*'w' or 'b'*/) {
	const attackers = [];
	const chess = new Chess();
	chess.load(fen);
	chess.setTurn(attacker_color);

	// put an opposite-colored piece in the square
	chess.put({type: 'n', 
		color: attacker_color === 'b' ? 'w' : 'b'},
		file+rank);

	// now generate all possible moves and count how many are attacks
	chess.moves({verbose:true}).forEach(function(move){
		/* { 
				color: 'w', from: 'a2', to: 'a3',
		        flags: 'n', piece: 'p',
		       	san 'a3', 'lan', 'a2a3',
		       	before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
		       	after: 'rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1'
		       	# a `captured` field is included when the move is a capture
		       	# a `promotion` field is included when the move is a promotion
		    } */
		if (move.to === file+rank) {
			attackers.push(move.from);
		}
	});

	return attackers;
};


/*
	chess: Chess object set to current position
	next: move to apply in algebraic form, e.g. 'nf3'
*/
Lineview.prototype.drawMove = function(chess, next, opacity) {
	const self = this;
	const move = chess.move(next);
	if (move) {
		self._chessboard.drawPiece(
			move.piece,
			move.to[0], // file
			move.to[1], // rank
			{fill: move.color == 'w' ? "blue" : "red", 
			stroke: "black", 
			opacity: opacity}
		);
		chess.undo();
	}
}

/*
	chess: set to current position
	tree: json tree of all moves from that pos
	{
		c: {'e4': {freq:0.4, c: {}}, 'd4': {freq:0.3, c: {}}, ... }
	}
*/
Lineview.prototype.drawLineTree = function(tree, chess, opacity, depth) {
	if (depth < 1) {
		return;
	}

	const self = this;

	const nextmoves = Object.keys(tree.c); //['nf3','nc3',...]
	if (depth == 1) {
		nextmoves.forEach(function(next) { //'nf3'
			//self.drawMove(chess, next, opacity);
			chess.move(next);
			self.drawAttackedByWhite(chess.fen());
			chess.undo();
		});
	} else {
		// walk all descendents
		nextmoves.forEach(function(next) { // 'nf3'
			let childNode = tree.c[next];
			chess.move(next);
			self.drawLineTree(childNode, chess, opacity, depth-1);
			chess.undo();
		})
	}
}
