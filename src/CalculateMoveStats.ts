
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
  	} else if (Number.isInteger(aparts[1]) && Number.isInteger(bparts[1])
  				&& aparts[1] !== bparts[1]) {
  		return Number(aparts[1]) - Number(bparts[1]);
  	} else if (Number.isInteger(aparts[2]) && Number.isInteger(bparts[2])) {
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
	  	const moveOccurrences : string[][] = []; // [['nf3', 1960.03.15], ['Qc1', 1970.??.??] ... ]

	  	if (moves.length < 2) {
	  		// if there's only 1 move that's ever been made then there can't be a novelty
	  		return [];
	  	}

	  	// total times this position has occurred
	  	let occurrances = 0;
	  	moves.forEach(function(move : string) {
	    	occurrances += history[move].length;

		    // look up all the games move appeared in
		    let games : GameInfo[] = history[move].map(function(id : string){
		      const g = self.loadGame(id);
		      g.set("id", id);  // add the id to the gameInfo itself so we can reference it later
		      return g;
		    }); 

		    games.forEach(function(game : GameInfo) {
		      moveOccurrences.push([move, game.get("Date")]);
		    })
	  	});

	  	// moveOccurrences is now an in-date-order list of every move ever made in position
	  	moveOccurrences.sort(function(a, b){return compareDates(a[1], b[1]);});

	  	let novelties : {[key:string] : boolean} = {}; // hash of all unique moves, e.g. 'nf3'
	  	const noveltyDates : {[key:string] : boolean} = {}; // hash of all 'first move' dates
	  	moveOccurrences.forEach(function(occurrance : string[]) { // ['nf3' , 1960.01.01]
		    const move = occurrance[0]; // 'nf3'
		    const date = occurrance[1];
		    if (!novelties[move]) {
		      novelties[move] = true;
		      noveltyDates[date] = true;
		    }
	  	})

	  	const firstMoveDates = Object.keys(noveltyDates).sort(compareDates);
	  	novelties = {};
	  	/*
	    	pivots:{
	      	'nf3': {
	        	total:
	        	byDate: {
	          	'1947.03.24': 12,   // number of times move was made (strictly) before given date
	          	'1950.??.??' : 17
	        	}
	      	}
	    	}
	  	*/
	  	const moveHistories : {[key:string]:MoveInfo} = {};
	  	const overCounts : {[key:string]:string[][]} = {}; // {'nf3': [[1960.??.??, 2], [1964.??.??, 0] ... ]}

	  	// moveOccurences: [['nf3', 1960.03.15], ['Qc1', 1970.??.??] ... ]
	  	moveOccurrences.forEach(function(occurrance : string[], idx:number) { 
	    	const move : string = occurrance[0]; // 'nf3'
		    const date : string = occurrance[1];
	    	const moveHistory = moveHistories[move] ?? new MoveInfo(move, date, pos.getFen(), pos.getId());

	    	if (firstMoveDates.length && compareDates(firstMoveDates[0], date) < 0) {
	    		// the next "Date of interest" occurred strictly after or at the same time as 
	  			// this occurance of 'move'. 
	  			const dateOfInterest : string = firstMoveDates.shift() ?? "";
	    		moveHistory.addDatePivot(dateOfInterest ?? "");

	    		// we want to figure out how many times 'move' occurred strictly after 'dateOfInterest'
	    		// so look ahead in moveOccurences and see how many future moves are the same as 'dateOfInterest'
	    		let ambiguousDateCount = 0;
	    		let lookAheadIndex = idx+1;
	    		while(lookAheadIndex < moveOccurrences.length 
	    				&& compareDates(dateOfInterest, moveOccurrences[lookAheadIndex][1]) == 0) 
	    		{
	    			lookAheadIndex++;
	    			ambiguousDateCount++;
	    		}

	    		// a naive calculation of 'striclyAfter' for a given date will erroneously include these ambiguous date occurances.
	    		// This move could've been made either before or after dateOfInterest so let's keep track of how many date collisions
	    		// happen so we can subtract them at the end.
	    		overCounts[move] = overCounts[move] ?? []; 
	    		overCounts[move].push([dateOfInterest, ambiguousDateCount.toString()]);
	    	}

	    	moveHistory.addOccurrance();
	    	moveHistories[move] = moveHistory;
	  	})

	  	// sanity check
	  	let total=0;
	  	Object.keys(moveHistories).forEach(function(move:string) {
	  		total += moveHistories[move].getTotal();
	  	})
	  	if (total != moveOccurrences.length) {
	  		throw "move totals don't match";
	  	}

	  	// now calculate the strictlyAfter values
	  	Object.keys(overCounts).forEach(function(move : string) {
	  		const moveInfo = moveHistories[move];
	  		overCounts[move].forEach(function(oc : string[]) {
	  			const date = oc[0];
	  			const over = Number(oc[1]);
	  			const before = moveInfo.getBeforeCount(date);
	  			moveInfo.setAfter(date, moveInfo.getTotal() - before - over);
	  		})
	  	})

	  	return Object.keys(moveHistories).map(key=>moveHistories[key]);

	} // analyzeMovesForPosition
 

} // Class CalculateMoveStats


export class MoveInfo {
	private total : number = 0;
	private firstPlayed : string = ""; // date move was first played
	private byDate : {[key:string]: {strictlyBefore : number, strictlyAfter : number}} = {};
	private move : string;
	private fen : string;
	private posId : string;

	public constructor(move : string, dateFirstPlayed : string, fen:string="", posId:string="") {
		this.move = move;
		this.firstPlayed = dateFirstPlayed;
		this.fen = fen;
		this.posId = posId;
	}

	public addOccurrance() : void {
		this.total ++;
	}

	public getTotal() : number {
		return this.total;
	}

	public addDatePivot(date : string) : void {
		this.byDate[date] = {
			strictlyBefore: this.total,
			strictlyAfter: -1
		};
	}

	public addDatePivotAfterCount(date : string, after : number) : void {
		this.byDate[date].strictlyAfter = this.total;
	}

	public getBeforeCount(date : string) : number {
		return this.byDate[date] ? this.byDate[date].strictlyBefore : 0;
	}

	public setAfter(date:string, count:number) : void {
		this.byDate[date].strictlyAfter = count;
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
console.log(JSON.stringify(moves, null, " "));