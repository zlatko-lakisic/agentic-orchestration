/**
 * Thin Prometheus text metrics for the web/coordinator process (no extra deps).
 * Opt-in Sentry via AGENTIC_WEB_SENTRY_DSN when @sentry/node is installed.
 */

const runsOk = { true: 0, false: 0 };
let runDurationSum = 0;
let runDurationCount = 0;
const topologyRttMs = new Map(); // target -> last rtt

export function recordWebRunEnd({ ok = true, elapsedMs = null } = {}) {
  const key = ok ? "true" : "false";
  runsOk[key] = (runsOk[key] || 0) + 1;
  if (elapsedMs != null && Number.isFinite(Number(elapsedMs))) {
    runDurationSum += Math.max(0, Number(elapsedMs) / 1000);
    runDurationCount += 1;
  }
}

export function recordTopologyRtt(target, rttMs) {
  const name = String(target || "").trim() || "unknown";
  const n = Number(rttMs);
  if (!Number.isFinite(n)) return;
  topologyRttMs.set(name, n);
}

export function metricsText() {
  const lines = [
    "# HELP ao_web_runs_total Web/coordinator orchestrated runs completed",
    "# TYPE ao_web_runs_total counter",
    `ao_web_runs_total{ok="true"} ${runsOk.true || 0}`,
    `ao_web_runs_total{ok="false"} ${runsOk.false || 0}`,
    "# HELP ao_web_run_duration_seconds_sum Web run wall time sum",
    "# TYPE ao_web_run_duration_seconds_sum counter",
    `ao_web_run_duration_seconds_sum ${runDurationSum}`,
    `ao_web_run_duration_seconds_count ${runDurationCount}`,
    "# HELP ao_topology_probe_rtt_ms Last sampled topology probe RTT",
    "# TYPE ao_topology_probe_rtt_ms gauge",
  ];
  for (const [target, rtt] of topologyRttMs.entries()) {
    const label = target.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`ao_topology_probe_rtt_ms{target="${label}"} ${rtt}`);
  }
  lines.push("");
  return lines.join("\n");
}

export async function maybeInitWebSentry() {
  const dsn = String(process.env.AGENTIC_WEB_SENTRY_DSN || "").trim();
  if (!dsn) return { enabled: false };
  try {
    const sentry = await import("@sentry/node");
    sentry.init({
      dsn,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend(event) {
        // Scrub common goal/prompt fields if present.
        if (event?.extra) {
          for (const key of Object.keys(event.extra)) {
            if (/goal|prompt|message|excerpt/i.test(key)) delete event.extra[key];
          }
        }
        return event;
      },
    });
    return { enabled: true };
  } catch (err) {
    return { enabled: false, error: String(err?.message || err) };
  }
}
