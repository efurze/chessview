import { CalculateMoveStats } from './CalculateMoveStats';

describe('Basic', () => {

    it('should say hello', () => {
        const finder = new CalculateMoveStats();
        expect(finder.sayHello()).toBe("Hello");
    });

})