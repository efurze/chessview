// chessboard.js
import { Chess } from '/public/js/third_party/chess.js'

const Chessboard = function(){

const size = 8; // Number of squares per row/column
const squareSize = 60; // Size of each square in pixels
const boardSize = size * squareSize; // Total size of the board
const chess = new Chess();

const PIECE = {
    'PAWN':     0, 
    'KNIGHT':    1,  
    'BISHOP':   2,
    'ROOK':     3,
    'QUEEN':    4,
    'KING':     5 
};

const PIECE_STYLE = {
    WHITE: {fill: "white", stroke: "black"},
    BLACK: {fill: "black", stroke: "white"}
};

const PIECE_MAP = {
    'p': PIECE.PAWN,
    'n': PIECE.KNIGHT,
    'b': PIECE.BISHOP,
    'r': PIECE.ROOK,
    'q': PIECE.QUEEN,
    'k': PIECE.KING
}

const SVG_FILES = [
    "images/pawn-w.svg",
    "images/knight-w.svg",
    "images/bishop-w.svg",
    "images/rook-w.svg",
    "images/queen-w.svg",
    "images/king-w.svg"
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squares, rects = [];

var drawBoard = function() {
    // Select the SVG element and set its width and height
    let svg = d3.select("#chessboard")
        .attr("width", boardSize)
        .attr("height", boardSize);

    // Create an array of data representing each square's position
    squares = d3.range(size * size).map(i => ({
        x: i % size,
        y: Math.floor(i / size)
    }));

    // Bind the data to SVG rectangles and create the squares
    rects = svg.selectAll("rect")
        .data(squares)
        .enter()
        .append("rect")
        .attr("x", d => d.x * squareSize)
        .attr("y", d => d.y * squareSize)
        .attr("width", squareSize)
        .attr("height", squareSize)
        .attr("fill", d => (d.x + d.y) % 2 === 0 ? "white" : "black");

    // Optionally, add a border around the chessboard
    svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", boardSize)
        .attr("height", boardSize)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2);

        return svg;
};

var file2Col = function(file) {
    return file.toLowerCase().charCodeAt(0) - String('a').charCodeAt(0);
}

var rank2Row = function(rank) {
    return 8 - rank;
}

/*
    type = PIECE.PAWN
    file = 'a'
    rank = '2'
    fill = 'white'
    stroke = 'black'
*/
var drawPiecePrivate = function(type, file, rank, fill, stroke, opacity=1) {
    let board = d3.select("#chessboard")

    const col = file2Col(file);
    const row = rank2Row(rank);


    d3.xml(SVG_FILES[type]).then(function(xml){
        let svg = board.append("svg")
            .attr("x", col * squareSize)
            .attr("y", row * squareSize)
            .attr("rank", rank)
            .attr("file", file)
            .attr("class", "piece")
            .attr("width", squareSize)
            .attr("height", squareSize)
            .attr("fill", fill)
            .attr("opacity", opacity)
            .attr("stroke", stroke);


        svg.node().appendChild(xml.documentElement.cloneNode(true));
    });
};

var setupPieces = function() {
    iface.drawFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
};


//public interface:
const iface = {

    initialize: function() {
        iface.clear();
        drawBoard();
    },

    resetSquareColors: function() {
        FILES.forEach(function(file, idx) {
            for(let rank=1; rank<9; rank++){
                iface.changeSquareColor(
                    file, 
                    rank, 
                    (rank + idx) % 2 ? "black" : "white");
            }
        });
    },

    clear: function() {
        d3.selectAll(".piece").remove();
    },

    clearSquare: function(file, rank) {
        // Select the piece SVG based on its x and y attributes
        const piece = d3.select(`svg.piece[rank="${rank}"][file="${file}"]`);
        piece.remove();
    },

    newGame: function() {
        initialize();
        setupPieces();
    },

    /*
        piece = 'p', 'n', 'q' etc
        file = 'a'
        rank = 2
        style = {
            fill: "white",
            stroke: "black"
        }
    */
    drawPiece: function(piece, file, rank, style=PIECE_STYLE.WHITE) {
        drawPiecePrivate(PIECE_MAP[piece], 
            file, 
            rank, 
            style.fill, 
            style.stroke,
            style.opacity ? style.opacity : 1);
    },

    drawFEN: function(fen) {
        drawBoard();
        chess.clear();
        chess.load(fen);
        FILES.forEach(function(file){
            for (let rank=1; rank < 9; rank++) {
                const piece = chess.get(file + rank); // { type: 'p', color: 'b' }
                if (piece) {
                    iface.drawPiece(piece.type, 
                        file, 
                        rank, 
                        piece.color === 'b' ? PIECE_STYLE.BLACK
                                            : PIECE_STYLE.WHITE);
                }
            }
        });
    },


    updateSquare: function(file, rank, fen) {
        // clear square of any existing piece
        iface.clearSquare(file, rank);

        // read board state for square
        chess.clear();
        chess.load(fen);
        const piece = chess.get(file+rank); // { type: 'p', color: 'b' }
        
        // now place the new piece in the destination
        if (piece) {
            iface.drawPiece(piece.type, 
                file, 
                rank, 
                piece.color === 'b' ? PIECE_STYLE.BLACK
                                    : PIECE_STYLE.WHITE);
        }
    },

    /*
        move = {from: "e2", to: "e4"}
        fen = string representing board state after move
    */
    updateMove: function(move, fen) {
        // update source square
        iface.updateSquare(move.from[0], move.from[1], fen);
        
        // update destination square
        iface.updateSquare(move.to[0], move.to[1], fen);

        // handle castling
        if (move.san === "O-O") {
            if (move.color == 'w') {
                iface.updateSquare('h', 1, fen);
                iface.updateSquare('f', 1, fen);
            } else {
                iface.updateSquare('h', 8, fen);
                iface.updateSquare('f', 8, fen);
            }

        } else if (move.san === "O-O-O"){
            if (move.color == 'w') {
                iface.updateSquare('a', 1, fen);
                iface.updateSquare('d', 1, fen);
            } else {
                iface.updateSquare('a', 8, fen);
                iface.updateSquare('d', 8, fen);
            }
        }
    },

    changeSquareColor: function(file, rank, color, opacity=1) {
        const col = file2Col(file);
        const row = rank2Row(rank);
        rects.filter(d => d.x === col && d.y === row)
            .attr("fill", color)
            .attr("opacity", opacity);
    }
}; // public interface

return iface; 

}(); // construct singleton

export {Chessboard};