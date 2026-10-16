import { buildActivity, timeAgo } from "../utils.js";
import { Avatar } from "./Badges.jsx";

export default function ActivityFeed({ tasks }) {
  const items = buildActivity(tasks);

  return (
    <section className="card" id="activity" aria-labelledby="activity-title">
      <div className="card__head">
        <h2 id="activity-title">Recent activity</h2>
      </div>
      {items.length === 0 ? (
        <p className="muted card__body">Nothing has happened yet.</p>
      ) : (
        <ol className="feed">
          {items.map((item) => (
            <li key={item.id} className="feed__item">
              <Avatar name={item.assignee} size={30} />
              <div className="feed__text">
                <p className="feed__title">{item.title}</p>
                <p className="feed__meta">
                  <span className={`feed__action status-text-${item.status}`}>{item.action}</span>
                  <span aria-hidden="true">·</span>
                  {item.assignee || "Unassigned"}
                  <span aria-hidden="true">·</span>
                  <time dateTime={item.at}>{timeAgo(item.at)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
