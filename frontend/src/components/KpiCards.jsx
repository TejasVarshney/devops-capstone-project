import { STATUSES } from "../constants.js";
import { AlertIcon, LayersIcon, ProgressIcon, TargetIcon } from "./Icons.jsx";

function Kpi({ icon: KpiIcon, label, value, tone = "neutral", children }) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon">
          <KpiIcon />
        </span>
      </div>
      <p className="kpi__value">{value}</p>
      <div className="kpi__foot">{children}</div>
    </article>
  );
}

export default function KpiCards({ stats }) {
  const { total, by_status: byStatus, completion_rate: completion, overdue, high_priority_open } = stats;
  const active = byStatus.in_progress + byStatus.review;

  return (
    <section className="kpis" aria-label="Key metrics">
      <Kpi icon={LayersIcon} label="Total tasks" value={total}>
        <div className="stacked-bar" role="img" aria-label="Tasks by status">
          {STATUSES.map(({ value, label }) =>
            byStatus[value] ? (
              <span
                key={value}
                className={`stacked-bar__seg status-bg-${value}`}
                style={{ flexGrow: byStatus[value] }}
                title={`${label}: ${byStatus[value]}`}
              />
            ) : null,
          )}
        </div>
      </Kpi>

      <Kpi icon={ProgressIcon} label="In flight" value={active} tone="info">
        <span>
          {byStatus.in_progress} in progress · {byStatus.review} in review
        </span>
      </Kpi>

      <Kpi icon={TargetIcon} label="Completion" value={`${Math.round(completion)}%`} tone="success">
        <div className="meter" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <span>{byStatus.done} done</span>
      </Kpi>

      <Kpi icon={AlertIcon} label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : "neutral"}>
        <span>{high_priority_open} high-priority open</span>
      </Kpi>
    </section>
  );
}
