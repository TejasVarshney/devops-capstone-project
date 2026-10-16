import { BUILD_INFO } from "../constants.js";
import { timeAgo } from "../utils.js";
import { CheckIcon, CommitIcon, ServerIcon } from "./Icons.jsx";

const STAGES = [
  { name: "Test", detail: "pytest · vite build" },
  { name: "Build", detail: "Docker images" },
  { name: "Scan", detail: "Trivy HIGH / CRITICAL" },
  { name: "Push", detail: "GHCR, tagged by commit" },
  { name: "Deploy", detail: "Helm → Kubernetes" },
];

export default function PipelineCard({ apiStatus, lastSynced }) {
  // Images built by CI receive the commit SHA as a build argument; local builds report "dev".
  const fromCi = BUILD_INFO.commit !== "dev";

  return (
    <section className="card" id="pipeline" aria-labelledby="pipeline-title">
      <div className="card__head">
        <h2 id="pipeline-title">Delivery pipeline</h2>
        <span className={`api-status api-status--${apiStatus}`}>
          <span className="api-status__dot" />
          {apiStatus === "up" ? "API online" : apiStatus === "down" ? "API unreachable" : "Checking…"}
        </span>
      </div>

      <ol className={`pipeline ${fromCi ? "pipeline--shipped" : ""}`}>
        {STAGES.map((stage, index) => (
          <li key={stage.name} className="pipeline__stage">
            <span className="pipeline__marker">{fromCi ? <CheckIcon size={13} /> : index + 1}</span>
            <span className="pipeline__text">
              <strong>{stage.name}</strong>
              <small>{stage.detail}</small>
            </span>
          </li>
        ))}
      </ol>

      <dl className="build-meta">
        <div>
          <dt>
            <CommitIcon size={15} /> Commit
          </dt>
          <dd>
            <code>{BUILD_INFO.commit.slice(0, 7)}</code>
            {!fromCi && <span className="muted"> (local build)</span>}
          </dd>
        </div>
        <div>
          <dt>
            <ServerIcon size={15} /> Environment
          </dt>
          <dd>{BUILD_INFO.environment}</dd>
        </div>
        <div>
          <dt>Last sync</dt>
          <dd>{lastSynced ? timeAgo(lastSynced) : "never"}</dd>
        </div>
      </dl>
    </section>
  );
}
