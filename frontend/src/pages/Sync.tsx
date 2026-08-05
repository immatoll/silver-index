import { useEffect, useRef, useState } from "react";
import { fetchLogs, fetchStatus, fetchSyncProgress, triggerSync } from "../api";
import type { Status, SyncProgress, SyncType } from "../api";

const EMPTY_PROGRESS: SyncProgress = {
    running: false,
    mode: null,
    kind: null,
    entityIndex: 0,
    entityTotal: 0,
    entityKey: null,
    entityLabel: null,
    page: 0,
    itemsFound: 0,
    startedAt: null,
    updatedAt: null,
    error: null
};

function formatElapsed(startedAt: number | null): string {
    if (!startedAt) return "-";

    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SyncPage() {
    const [status, setStatus] = useState<Status>({
        worldObjects: 0,
        worldEvents: 0,
        silverlinkObjects: 0,
        silverlinkEvents: 0
    });

    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState<SyncProgress>(EMPTY_PROGRESS);
    const [busyNotice, setBusyNotice] = useState<string | null>(null);
    const wasRunning = useRef(false);

    async function load() {
        const [nextStatus, nextLogs] = await Promise.all([
            fetchStatus(),
            fetchLogs()
        ]);

        setStatus(nextStatus);
        setLogs(nextLogs);
    }

    async function pollProgress() {
        const next = await fetchSyncProgress();
        setProgress(next);

        // A sync just finished (or failed) — refresh counts/logs once so the
        // dashboard reflects the new totals without waiting for the slow
        // 60s poll.
        if (wasRunning.current && !next.running) {
            await load();
        }

        wasRunning.current = next.running;
    }

    async function sync(type: SyncType) {
        setBusyNotice(null);

        const result = await triggerSync(type);

        if (result.status === "busy") {
            setBusyNotice("A sync is already running — wait for it to finish first.");
            return;
        }

        await pollProgress();
    }

    useEffect(() => {
        load();
        pollProgress();

        const statusTimer = setInterval(load, 60000);
        const progressTimer = setInterval(pollProgress, 1000);

        return () => {
            clearInterval(statusTimer);
            clearInterval(progressTimer);
        };
    }, []);

    const entityProgressLabel =
        progress.entityTotal > 0
            ? `Entity ${progress.entityIndex + 1} of ${progress.entityTotal}`
            : "-";

    const entityProgressPct =
        progress.entityTotal > 0
            ? Math.round(((progress.entityIndex + (progress.running ? 0.5 : 1)) / progress.entityTotal) * 100)
            : 0;

    return (
        <>
            <section className="grid">
                <div className="panel">
                    <h2>DATABASE STATUS</h2>

                    <div className="stats">
                        <div>
                            <label>WORLD OBJECTS</label>
                            <strong>{status.worldObjects}</strong>
                        </div>

                        <div>
                            <label>WORLD EVENTS</label>
                            <strong>{status.worldEvents}</strong>
                        </div>

                        <div>
                            <label>SILVER LINK OBJECTS</label>
                            <strong>{status.silverlinkObjects}</strong>
                        </div>

                        <div>
                            <label>SILVER LINK EVENTS</label>
                            <strong>{status.silverlinkEvents}</strong>
                        </div>
                    </div>
                </div>

                <div className="panel operations">
                    <h2>OPERATIONS</h2>

                    {busyNotice && <p className="sync-notice">{busyNotice}</p>}

                    <button onClick={() => sync("world-objects")} disabled={progress.running}>
                        SYNC WORLD OBJECTS
                    </button>

                    <button onClick={() => sync("world-events")} disabled={progress.running}>
                        SYNC WORLD EVENTS
                    </button>

                    <button onClick={() => sync("silverlink-objects")} disabled={progress.running}>
                        SYNC SILVER LINK OBJECTS
                    </button>

                    <button onClick={() => sync("silverlink-events")} disabled={progress.running}>
                        SYNC SILVER LINK EVENTS
                    </button>
                </div>
            </section>

            {(progress.running || progress.error) && (
                <section className="panel sync-progress-panel">
                    <h2>{progress.running ? "SYNC IN PROGRESS" : "LAST SYNC FAILED"}</h2>

                    {progress.error ? (
                        <p className="sync-error">{progress.error}</p>
                    ) : (
                        <>
                            <div className="sync-progress-bar-track">
                                <div
                                    className="sync-progress-bar-fill"
                                    style={{ width: `${entityProgressPct}%` }}
                                />
                            </div>

                            <div className="sync-progress-meta">
                                <span>{progress.mode}</span>
                                <span>{entityProgressLabel}</span>
                                <span>{progress.entityLabel ?? "-"}</span>
                                <span>Page {progress.page}</span>
                                <span>{progress.itemsFound} found</span>
                                <span>Elapsed {formatElapsed(progress.startedAt)}</span>
                            </div>
                        </>
                    )}
                </section>
            )}

            <section className="panel log-panel">
                <h2>LIVE SYSTEM LOG</h2>

                <pre>{logs.join("\n")}</pre>
            </section>
        </>
    );
}
