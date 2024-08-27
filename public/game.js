import { Chess } from '/public/js/third_party/chess.js'
import { Chessboard } from './chessboard.js'
import { MoveTrie } from './movetrie.js'
import { Lineview } from './lineview.js'

const gameState = new Chess();
const trie = new MoveTrie();
const lineview = new Lineview(Chessboard, trie);
let moves = [];
let moveIdx = 0;

const gamePGN = "1.c4 e5 2.g3 Nf6 3.Bg2 d5 4.cxd5 Nxd5 5.Nc3 Nb6 6.a3 Nc6 7.b4 Be6 8.Rb1 a6 9.Nf3 Be7 10.O-O O-O 11.d3 f5 12.Bb2 Bf6 13.Nd2 Qd6 14.Nb3 Rad8 15.Nc5 Bc8 16.e3 Kh8 17.Qb3 Be7 18.Ne2 Rde8 19.Rbc1 Nd8 20.e4 f4 21.d4 exd4 22.gxf4 Nc6 23.f5 Qh6 24.Nxd4 Bd6 25.Nf3 Nd7 26.Rfe1 Nde5 27.Nxe5 Nxe5 28.Qe3 Qxe3 29.Rxe3 Ng4 30.Rh3 Nf6 31.Rh4 c6 32.Nd3 Bc7 33.Re1 Rd8 34.Nf4 Rfe8 35.Bc3 Kg8 36.Bf3 Re7 37.Re3 Rde8 38.Nh5 Nd5 39.f6 Nxc3 40.fxe7 Be5 41.Rd3 Kf7 42.Nxg7 Bxg7 43.Rxh7 Rxe7 44.Rxc3 Kg6 45.Rxg7+ Rxg7 46.Bg2 Rd7 47.Bh3 Rd1+ 48.Kg2";

let parseLayers = function(tree, label, layers, depth) {
	if (depth < 1) {
		return;
	}
	const index = layers.length - depth;
	const layer = layers[index];
	layer.push(label);

	let children = Object.keys(tree.c);
	children.forEach(function(key, idx) { // 'nf3'
		let childlabel = "";
		if (idx == 0) {
			childlabel += "(";
		}
		childlabel += key;
		if (idx == children.length - 1) {
			childlabel += ")";
		}
		parseLayers(tree.c[key], childlabel, layers, depth-1);
	})
}

let printTree = function(tree, label, width, depth=2) {
	
	const layers = [];
	for (let i=0;i<depth;i++){
		layers[i] = [];
	}
	parseLayers(tree, label, layers, depth);

	layers.forEach(function(layer){
		let count = layer.length;
		let itemwidth = width/count;
		let itempad = itemwidth/2;
		let line = "";
		let pad = "";
		for(let i=0; i < itempad; i++){
			pad += " ";
		}
		layer.forEach(function(item){
			line += pad + item + pad;
		})

		console.log(line);
	})
}


let depth = 0;
let keypress = function(e) {
	let move = null;
	if (e.key == "ArrowRight") {
		if (moveIdx < moves.length) {
			move = gameState.move(moves[moveIdx]);
			moveIdx ++;
		}
	} else if (e.key == "ArrowLeft") {
		if (moveIdx > 0) {
			move = gameState.undo();
			moveIdx --;
		}
	} else if (e.key == "l") {
		const node = trie.getNodeAt(gameState.history());
		const lines = trie.getTopLinesFrom(node, 1);
		//printTree(lines, "root", 190, 20);
		Chessboard.resetSquareColors();
		lineview.drawLineTree(lines, new Chess(gameState.fen()), 1, ++depth);
	}

	if (move) {
		Chessboard.updateMove(move, gameState.fen());
		//Chessboard.resetSquareColors();
		//drawAttackedByWhite(gameState.fen());
	}
};

function ajaxRequest() {
	fetch('/data/c4lines.json')
		.then(function(res){
			return res.json();
		}).then(function(data){
			trie.init(data);
		}).catch(function(error) {
			console.log(error);
		});
}

export function initGameListener() {
	document.addEventListener('keydown', keypress);
	ajaxRequest();
	gameState.loadPgn(gamePGN);
	moves = gameState.history();
	gameState.reset();
	Chessboard.drawFEN(gameState.fen());
};
