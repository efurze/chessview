import { Chess } from '/public/js/third_party/chess.js';
import { Chessboard } from './chessboard.js';


const chess = new Chess();
const visitedSquares = {};


//fens is ary
function drawMovesToDepth(fens, depth=1, opacity=1) {
	if (depth < 1)
		return;

	const nextLevel = [];
	
	fens.forEach(function(fen){
		chess.load(fen, {skipValidation:true, preserveHeaders:false});
		const moves = chess.moves(); 			// e.g. ['Nc5', 'Nd6', 'Nf6', 'Ng5', 'Ng3', 'Nf2', 'Nd2', 'Nc3']
		moves.forEach(function(m) { 			// e.g. 'Nc5'
			const move = parseMove(m);
			if (move.square in visitedSquares) {
				return;
			}
			visitedSquares[move.square] = true;

			//draw square
			Chessboard.changeSquareColor(move.file, move.rank, 'blue', opacity);

			//put position from move into breadth-first array
			chess.load(fen, {skipValidation:true, preserveHeaders:false});
			chess.move(m);
			// we have to manually change the 'turn' from b to w
			let nextPos = new String(chess.fen());
			nextPos = nextPos.replace(" b", " w");
			nextLevel.push(nextPos);
		});
	});

	drawMovesToDepth(nextLevel, depth-1, opacity/2);

}

/*
	returns {
		file: 'e',
		rank: 4,
		square: e4,
		piece: 'n' OR 'n3'
	}
*/
function parseMove(move) {
	return {
		file: move[1],
		rank: move[2],
		square: move[1] + move[2],
		piece: move[0]
	};
}



Chessboard.initialize();
Chessboard.drawPiece('n', 'e', 4);
//Chessboard.changeSquareColor('b', 2, 'blue');
visitedSquares['e4'] = true;
drawMovesToDepth(['8/8/8/8/4N3/8/8/8 w - - 0 1'], 4);



