export function DonutChart({ values, total }: { values: number[]; total: number }) {
  const circumference = 251.2;
  const first = (values[0] / 100) * circumference;
  const second = (values[1] / 100) * circumference;
  const third = (values[2] / 100) * circumference;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 96 96" className="donut-chart__svg">
        <circle className="donut-chart__track" cx="48" cy="48" r="40" />
        <circle
          className="donut-chart__segment donut-chart__segment--design"
          cx="48"
          cy="48"
          r="40"
          strokeDasharray={`${first} ${circumference - first}`}
          strokeDashoffset="0"
        />
        <circle
          className="donut-chart__segment donut-chart__segment--frontend"
          cx="48"
          cy="48"
          r="40"
          strokeDasharray={`${second} ${circumference - second}`}
          strokeDashoffset={-first}
        />
        <circle
          className="donut-chart__segment donut-chart__segment--backend"
          cx="48"
          cy="48"
          r="40"
          strokeDasharray={`${third} ${circumference - third}`}
          strokeDashoffset={-(first + second)}
        />
      </svg>
      <span className="donut-chart__value">{total}</span>
    </div>
  );
}
