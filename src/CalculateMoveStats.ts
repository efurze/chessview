
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


function loadFile(filename:string) : string {
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return data.toString();
  } catch (e) {
    //console.log("JSON file not read: " + e.toString());
  }
  return "";
}

function saveObject(obj : any, filename : string) : void {
  try {
    const json = JSON.stringify(obj, null, " ");
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.error(e);
  }
}

// negative return value => a comes before b
function compareDates(a : string, b : string) : number {
	const aparts = a.split("."); // [1960, ??, ??]
	const bparts = b.split(".");
  
  	if (aparts[0] !== bparts[0]) {
  		// year
  		return Number(aparts[0]) - Number(bparts[0]);
  	} else if (!isNaN(Number(aparts[1])) && !isNaN(Number(bparts[1]))
  				&& aparts[1] !== bparts[1]) {
  		return Number(aparts[1]) - Number(bparts[1]);
  	} else if (!isNaN(Number(aparts[2])) && !isNaN(Number(bparts[2]))) {
  		return Number(aparts[2]) - Number(bparts[2]);
  	} else {
  		return 0;
  	}
}



export class CalculateMoveStats {

	private fileGenerator : Generator<string>;
	private baseDir : string;

	public constructor(dirpath : string){
		this.baseDir = dirpath;
		this.fileGenerator = this.enumerateFiles(path.join(dirpath, "positions"));
	}

	public getStats() : MoveInfo[] {
		let file;
	  	let count = 0;
	  	let ret : MoveInfo[] = [];
		  
		while ((file = this.fileGenerator.next().value) !== undefined) {
		    count++;
		    const posId = path.basename(path.dirname(file)) + path.basename(file);
		    const position = PositionInfo.fromString(loadFile(file), posId);
		    const moves = this.analyzeMovesForPosition(position);
		    ret = ret.concat(moves);
		}

		return ret;
	}

	* enumerateFiles(dir : string) : Generator<string> {
	  for (const entry of fs.readdirSync(dir)) {
	    const fullPath = path.join(dir, entry);
	    if (fs.statSync(fullPath).isDirectory()) {
	      yield* this.enumerateFiles(fullPath);
	    } else {
	      yield fullPath;
	    }
	  }
	}

	private loadGame (gameid : string) : GameInfo { // hash
	  const filepath = path.join(this.baseDir, "games", gameid.slice(0,2) + path.sep + gameid.slice(2));
	  return new GameInfo(loadFile(filepath));
	}

	/*

  This returns all unique moves in a position with associated data.

  returns:
  [
    fen:    string
    move:   'nf3'
    date:   string 
    gameid: string
    white:  player name
    black:  player name
    count:  number of times this move has been made
    strictlyBefore:
    strictlyAfter:
    total:  number of times this position has occurred 

    other: {
      'e4': {
        strictlyBefore:
        strictlyAfter:
        count:
      }
    }
  ]
*/
	private analyzeMovesForPosition (pos : PositionInfo) : MoveInfo[] {
		const self = this;
	  	const history : {[key:string] : string[]} = pos.getHistory();
	  	const moves = Object.keys(history); // distinct moves for this position
	  	const moveOccurrences : string[][] = []; // [['nf3', <gameId>], ['Qc1', <gameId>] ... ]
	  	const gameInfos : {[key:string]:GameInfo} = {}; // {<gameId> : GameInfo, ...}

		// helper function so I don't have to type gameInfos[moveOccurrences[m][1]].get("Date") everywhere
	  	function getMoveDate(m : string[]) : string {
	  		return gameInfos[m[1]].get("Date");
	  	}

	  	function getGameInfo(m : string[]) : GameInfo {
	  		return gameInfos[m[1]];
	  	}

	  	if (moves.length < 2) {
	  		// if there's only 1 move that's ever been made then there can't be a novelty
	  		return [];
	  	}

	  	// total times this position has occurred
	  	let occurrances = 0;
	  	moves.forEach(function(move : string) { // each unique move ever made in the position
	    	occurrances += history[move].length;

		    // look up all the games move appeared in
		    let games : GameInfo[] = history[move].map(function(id : string){
		    	const g = self.loadGame(id);
		    	g.set("id", id);  // add the id to the gameInfo itself so we can reference it later
		    	// stash this for future reference
		    	gameInfos[id] = g;
		    	return g;
		    }); 

		    games.forEach(function(game : GameInfo) {
		      moveOccurrences.push([move, game.get("id")]);
		    })
	  	});

	  	// moveOccurrences is now an in-date-order list of every move ever made in position
	  	moveOccurrences.sort(function(a, b){return compareDates(getMoveDate(a), getMoveDate(b));});


	  	const moveHistories : {[key:string]:MoveInfo} = {}; // {'nf3' : <MoveInfo>}

	  	// moveOccurences: [['nf3', gameId], ['Qc1', gameId] ... ]
	  	// Go forward through time and keep running totals for each move
	  	moveOccurrences.forEach(function(occurrance : string[], idx:number) { 
	    	const move : string = occurrance[0]; // 'nf3'
		    const date : string = getMoveDate(occurrance);
		    const gameInfo : GameInfo = getGameInfo(occurrance);
		    let moveHistory : MoveInfo;

	    	if (move in moveHistories) {
	    		moveHistory = moveHistories[move];
	    	} else {
	    		// this is the first time we're seeing this move

	    		// create a date pivot for every previously encountered move
	    		// IMPORTANT: these values have to be adjusted below for ambiguous dates.
	    		// If an existing move has a total which includes a game played on the same date
	    		// as the current move, then that game shouldn't be included in <strictlyBefore>
	    		Object.keys(moveHistories).forEach(function(move:string) {
	    			moveHistories[move].addDatePivot(date);
	    		})

	    		// we want to know how many moves were made strictly before this one, which is idx
		    	// minus any moveOccurrences that happened on the same date
		    	let lookBehindIndex = idx-1;
		    	let ambiguousDateCountBefore = 0;
		    	while(lookBehindIndex > 0 && compareDates(date, getMoveDate(moveOccurrences[lookBehindIndex])) == 0) {
		    		// walk back through history and adjust any overcounts made by games recorded on the same date
		    		// in most cases we'll never get here

		    		// adjust the 'strictlyBefore' value for the moveHistory for a previously seen move
		    		// this fixes the value created in the addDatePivot above
		    		moveHistories[moveOccurrences[lookBehindIndex][0]].decrementBeforeForDate(date);

		    		lookBehindIndex --;
		    		ambiguousDateCountBefore ++;
		    	}

		    	// we also want to figure out how many moves occurred strictly after this one
	    		// but we don't want to count games that occurred on the same date
	    		// so look ahead in moveOccurences and see how many future moves are the same as 'date'
	    		let ambiguousDateCountAfter = 0;
	    		let lookAheadIndex = idx+1;
	    		while(lookAheadIndex < moveOccurrences.length 
	    				&& compareDates(date, getMoveDate(moveOccurrences[lookAheadIndex])) == 0) 
	    		{
		    		// adjust the 'strictlyAefore' value for the moveHistory for a previously seen move
		    		// this fixes the value created in the addDatePivot above. This will create negative
		    		// values for 'strictlyAfter' that will only be accurate after the entire history is processed
		    		moveHistories[moveOccurrences[lookAheadIndex][0]].decrementAfterForDate(date);
		    		
	    			lookAheadIndex ++;
	    			ambiguousDateCountAfter ++;
	    		}


	    		moveHistory = new MoveInfo(move, 
					    		date,
					    		gameInfo.get("id"),
					    		idx - ambiguousDateCountBefore,
					    		moveOccurrences.length - idx - 1 - ambiguousDateCountAfter,
					    		pos.getFen(), 
					    		pos.getId());
	    	}

	    	moveHistory.addOccurrance();
	    	moveHistories[move] = moveHistory;
	  	})

	  	// sanity check
	  	let total=0;
	  	Object.keys(moveHistories).forEach(function(move:string) {
	  		moveHistories[move].sanityCheck();
	  		total += moveHistories[move].getTotal();
	  	})
	  	if (total != moveOccurrences.length) {
	  		throw new Error("Move totals don't match");
	  	}

	  	return Object.keys(moveHistories).map(key=>moveHistories[key]);

	} // analyzeMovesForPosition
 

} // Class CalculateMoveStats


export class MoveInfo {
	private total : number = 0;
	private strictlyBefore : number = 0; // number of times ANY move occurred strictly before firstPlayed
	private strictlyAfter : number = 0;  // ditto above for after.
	private firstPlayed : string = ""; // date move was first played
	private gameId : string = ""; // gameId of first appearance
	private byDate : {[key:string]: {
		strictlyBefore : number, 		// number of times THIS MOVE was played strictly before date key
		strictlyAfter : number}} = {};
	private move : string;
	private fen : string;
	private posId : string;

	public constructor(move : string, dateFirstPlayed : string, gameId:string, before:number, after:number, fen:string="", posId:string="") {
		this.move = move;
		this.firstPlayed = dateFirstPlayed;
		this.gameId = gameId;
		this.strictlyBefore = before;
		this.strictlyAfter = after;
		this.fen = fen;
		this.posId = posId;
	}

	public addOccurrance() : void {
		const self = this;
		self.total ++;
		// update the pivots
		Object.keys(self.byDate).forEach(function(date:string) {
			self.byDate[date].strictlyAfter ++;
		})
	}

	public getTotal() : number {
		return this.total;
	}

	public getMove() : string {
		return this.move;
	}

	public addDatePivot(date : string) : void {
		this.byDate[date] = {
			strictlyBefore: this.total,
			strictlyAfter: 0
		};
	}

	public decrementBeforeForDate(date: string) : void {
		this.byDate[date].strictlyBefore --;
	}

	public decrementAfterForDate(date: string) : void {
		this.byDate[date].strictlyAfter --;
	}

	public getBeforeCount(date : string) : number {
		return this.byDate[date] ? this.byDate[date].strictlyBefore : 0;
	}

	public getStrictlyBefore():number {
		return this.strictlyBefore;
	}

	public getStrictlyAfter():number {
		return this.strictlyAfter;
	}

	public getPivots():string[] {
		return Object.keys(this.byDate);
	}

	public getPivotBefore(date:string):number{
		return this.byDate[date].strictlyBefore;
	}

	public getPivotAfter(date:string):number{
		return this.byDate[date].strictlyAfter;
	}

	public sanityCheck() : void {
		const self = this;
		let count = 0;
		Object.keys(self.byDate).forEach(function(date:string) {
			if ((self.byDate[date].strictlyBefore + self.byDate[date].strictlyAfter) > self.total) {
				throw new Error("Move counts don't add up for " + JSON.stringify(self.byDate[date]) + "   total = " + self.total);	
			}
		})
	}
}


class GameInfo {
	private meta : {[key:string] : string} = {};

	public constructor(data : string) {
		const self = this;
		const g = JSON.parse(data);
		Object.keys(g).forEach(function(key : string) {
			self.meta[key] = g[key];
		})
	}

	public get(key : string) : string {
		return this.meta[key];
	}

	public set(key : string, value : string) : void {
		this.meta[key] = value;
	}
}

class PositionInfo {
	private fen : string;
	private id : string;
	private history : {[key:string] : string[]}; // {'nf3' : [gameid, gameid ...], 'e4':[], ...}

	public constructor(fen:string, history:{[key:string] : string[]}, id:string="") {
		this.fen = fen;
		this.id = id;
		this.history = history;
	}

	public getFen() : string {
		return this.fen;
	}

	public getId() : string {
		return this.id;
	}

	public getHistory() : {[key:string] : string[]} {
		return this.history;
	}

	public addGame(move:string, gameId:string) : void {
		this.history[move] = this.history[move] ?? [];
		this.history[move].push(gameId);
	}

	public toString() : string {
		const obj = {
			id: this.id,
			history: this.history
		};
		return JSON.stringify(obj);
	}

	public static fromString(data : string, posId:string="") : PositionInfo {
		const obj = JSON.parse(data);
		return new PositionInfo(obj.fen, obj.moves, posId);
	}
}


const moveFinder = new CalculateMoveStats("./test");
const moves = moveFinder.getStats();
//console.log(JSON.stringify(moves, null, " "));