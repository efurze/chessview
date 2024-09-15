import { CalculateMoveStats, MoveInfo, PositionInfo } from './CalculateMoveStats';
import * as path from 'path';

describe('Basic', () => {

    let moveHash : {[key:string] : MoveInfo} = {};

    it('should process a position', () => {
        const moveFinder = new CalculateMoveStats("../data/2400caissabase/games");
        const fileGenerator = moveFinder.enumerateFiles(path.join("./test", "positions"));
        const file = fileGenerator.next().value;
        const posId = path.basename(path.dirname(file)) + path.basename(file);
        const position = PositionInfo.fromString(moveFinder.loadFile(file), posId);
        const moves = moveFinder.analyzeMovesForPosition(position);
        
        
        moves.forEach(function(move:MoveInfo) {
            moveHash[move.getMove()] = move;
        })

        expect(moves.length).toBe(6);
    });

    it('should calculate move totals correctly', () => {
        expect(moveHash['d5'].getTotal()).toBe(21);
        expect(moveHash['d5'].getStrictlyBefore()).toBe(0);
        expect(moveHash['d5'].getStrictlyAfter()).toBe(51);

        expect(moveHash['b3'].getTotal()).toBe(12);
        expect(moveHash['b3'].getStrictlyBefore()).toBe(1);
        expect(moveHash['b3'].getStrictlyAfter()).toBe(50);

        expect(moveHash['Re1'].getTotal()).toBe(10);
        expect(moveHash['Re1'].getStrictlyBefore()).toBe(6);
        expect(moveHash['Re1'].getStrictlyAfter()).toBe(44);

        expect(moveHash['Nd5'].getTotal()).toBe(7);
        expect(moveHash['Nd5'].getStrictlyBefore()).toBe(20);
        expect(moveHash['Nd5'].getStrictlyAfter()).toBe(31);

        expect(moveHash['Qb3'].getTotal()).toBe(1);
        expect(moveHash['Qb3'].getStrictlyBefore()).toBe(22);
        expect(moveHash['Qb3'].getStrictlyAfter()).toBe(29);

        expect(moveHash['b4'].getTotal()).toBe(1);
        expect(moveHash['b4'].getStrictlyBefore()).toBe(43);
        expect(moveHash['b4'].getStrictlyAfter()).toBe(8);
    });

    it('should calculate pivots', () => {
        const moveInfo = moveHash['d5'];
        const pivots = moveInfo.getPivots();
        expect(pivots.length).toBe(5);

        expect(moveInfo.getPivotBefore("1986.??.??")).toBe(1);
        expect(moveInfo.getPivotAfter("1986.??.??")).toBe(20);

        expect(moveInfo.getPivotBefore("1990.??.??")).toBe(2);
        expect(moveInfo.getPivotAfter("1990.??.??")).toBe(19);

        expect(moveInfo.getPivotBefore("1998.07.29")).toBe(10);
        expect(moveInfo.getPivotAfter("1998.07.29")).toBe(11);

        expect(moveInfo.getPivotBefore("2000.04.09")).toBe(10);
        expect(moveInfo.getPivotAfter("2000.04.09")).toBe(11);

        expect(moveInfo.getPivotBefore("2014.03.15")).toBe(20);
        expect(moveInfo.getPivotAfter("2014.03.15")).toBe(1);
    });

})

/*

d5 {
first: 1982.??.??
total: 21
strictlyBefore: 0
strictlyAfter: 51

pivots: {
    1986.??.??: {
        before: 1
        after: 20
    },
    {
    1990.??.??: {
        before: 2
        after: 19
    },
    {
    1998.07.29: {
        before: 10
        after: 11
    },
    {
    2000.04.09: {
        before: 10
        after: 11
    }
    {
    2014.03.15: {
        before: 20
        after: 1
    }
}
}

b3 {
first: 1986.??.??
total: 12
strictlyBefore: 1
strictlyAfter: 50
}

Re1 {
first: 1990.??.??
total: 10
strictlyBefore: 6
strictlyAfter: 44
}

Nd5 {
first: 1998.07.29
total: 7
strictlyBefore: 20
strictlyAfter: 31
}

Qb3 {
first: 2000.04.09
total: 1
strictlyBefore: 22
strictlyAfter: 29
}

b4 {
total: 1
first: 2014.03.15
strictlyBefore: 43
strictlyAfter: 8
}
*/