interface Event {
  type: 'one-time' | 'recurrent';
  value: number;
  date: Date;
}

interface State {
  initialValue: number;
  date: Date;
}

export function simulateWealthCurve(initialState: State, events: Event[], rate: number) {
  const monthlyRate = rate / 12;
  const projections: { year: number; projectedValue: number }[] = [];
  let currentValue = initialState.initialValue;
  const endDate = new Date('2060-12-31T00:00:00.000Z');

  for (
    let d = new Date(initialState.date); 
    d <= endDate; 
    d.setMonth(d.getMonth() + 1)
  ) {
    currentValue *= 1 + monthlyRate;

    for (const event of events) {
      if (event.type === 'one-time' && event.date.getMonth() === d.getMonth() && event.date.getFullYear() === d.getFullYear()) {
        currentValue += event.value;
      }
      if (event.type === 'recurrent' && event.date.getMonth() === d.getMonth()) {
        currentValue += event.value;
      }
    }

    if (d.getMonth() === 11) {
      projections.push({ year: d.getFullYear(), projectedValue: currentValue });
    }
  }

  return projections;
}