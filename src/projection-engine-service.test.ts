const { simulateWealthCurve } = require('./projection-engine-service');

describe('simulateWealthCurve', () => {
  test('should simulate wealth curve with positive growth', () => {
    const initialState = {
      initialWealth: 1000,
      monthlyContribution: 100,
      monthlyGrowthRate: 0.01, // 1% monthly growth
      projectionMonths: 3,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    // Use toBeCloseTo for floating point comparisons
    result.forEach((value: number, index: number) => {
      expect(value).toBeCloseTo(expectedWealthCurve[index] as number);
    });
  });

  test('should simulate wealth curve with zero growth', () => {
    const initialState = {
      initialWealth: 1000,
      monthlyContribution: 50,
      monthlyGrowthRate: 0, // 0% monthly growth
      projectionMonths: 3,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    result.forEach((value: number, index: number) => {
      expect(value).toBeCloseTo(expectedWealthCurve[index] as number);
    });
  });

  test('should simulate wealth curve with negative growth (depreciation)', () => {
    const initialState = {
      initialWealth: 1000,
      monthlyContribution: 0,
      monthlyGrowthRate: -0.05, // -5% monthly depreciation
      projectionMonths: 3,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    result.forEach((value: number, index: number) => {
      expect(value).toBeCloseTo(expectedWealthCurve[index] as number);
    });
  });

  test('should handle zero monthly contribution', () => {
    const initialState = {
      initialWealth: 1000,
      monthlyContribution: 0,
      monthlyGrowthRate: 0.02,
      projectionMonths: 2,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    result.forEach((value: number, index: number) => {
      expect(value).toBeCloseTo(expectedWealthCurve[index] as number);
    });
  });

  test('should handle zero initial wealth', () => {
    const initialState = {
      initialWealth: 0,
      monthlyContribution: 100,
      monthlyGrowthRate: 0.01,
      projectionMonths: 2,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    result.forEach((value: number, index: number) => {
      expect(value).toBeCloseTo(expectedWealthCurve[index] as number);
    });
  });

  test('should handle single projection month', () => {
    const initialState = {
      initialWealth: 500,
      monthlyContribution: 50,
      monthlyGrowthRate: 0.01,
      projectionMonths: 1,
    };

    const calculateExpected = (initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) => {
      const expected: number[] = [];
      let current = initialState.initialWealth;
      for (let i = 0; i < initialState.projectionMonths; i++) {
        current = (current * (1 + initialState.monthlyGrowthRate)) + initialState.monthlyContribution;
        expected.push(current);
      }
      return expected;
    };

    const expectedWealthCurve = calculateExpected(initialState);

    const result = simulateWealthCurve(initialState);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(expectedWealthCurve[0] as number);
  });

  test('should handle large number of projection months', () => {
    const initialState = {
      initialWealth: 1000,
      monthlyContribution: 100,
      monthlyGrowthRate: 0.005, // 0.5% monthly
      projectionMonths: 120, // 10 years
    };

    const result = simulateWealthCurve(initialState);
    expect(result).toHaveLength(120);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i + 1]).toBeGreaterThan(result[i]);
    }
  });
});