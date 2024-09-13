import { CalculateMoveStats, MoveInfo } from './CalculateMoveStats';

describe('Basic', () => {

    it('should process a position', () => {
        const moveFinder = new CalculateMoveStats("./test");
        const moves = moveFinder.getStats();
    });

})