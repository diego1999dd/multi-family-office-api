export interface Event {
  type: 'inflow' | 'outflow';
  value: number;
  frequency: 'monthly' | 'yearly' | 'unique';
  year?: number; // Only for unique events
  month?: number; // Only for unique events
}

export interface ProjectionPoint {
  year: number;
  projectedValue: number;
}

export function simulateWealthCurve(
  initialValue: number,
  events: Event[],
  monthlyRate: number
): ProjectionPoint[] {
  const projection: ProjectionPoint[] = [];
  let currentValue = initialValue;
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year <= 2060; year++) {
    for (let month = 1; month <= 12; month++) {
      // Apply monthly growth
      currentValue *= (1 + monthlyRate);

      // Process events
      events.forEach(event => {
        let eventValue = event.type === 'inflow' ? event.value : -event.value;

        if (event.frequency === 'monthly') {
          currentValue += eventValue;
        } else if (event.frequency === 'yearly' && month === 12) {
          currentValue += eventValue;
        } else if (event.frequency === 'unique' && event.year === year && event.month === month) {
          currentValue += eventValue;
        }
      });
    }
    projection.push({ year, projectedValue: currentValue });
  }

  return projection;
}