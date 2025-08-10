
module.exports.simulateWealthCurve = function simulateWealthCurve(initialState: { initialWealth: number; monthlyContribution: number; monthlyGrowthRate: number; projectionMonths: number; }) {
  const wealthCurve: number[] = [];
  let currentWealth = initialState.initialWealth;

  for (let i = 0; i < initialState.projectionMonths; i++) {
    // Apply monthly growth
    currentWealth *= (1 + initialState.monthlyGrowthRate);
    // Add monthly contribution
    currentWealth += initialState.monthlyContribution;
    wealthCurve.push(currentWealth);
  }

  return wealthCurve;
}
