import { useEffect, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowParams } from "@mui/x-data-grid";
import {
    fetchChainEvents,
    fetchChainObjects,
    fetchEntities
} from "../api";
import type { Catalog, ChainEventRow, ChainObjectRow, EntityCatalog, EntityInfo } from "../api";
import { MODULES } from "../functions";

type Tab = "objects" | "events" | "functions";
type Row = ChainObjectRow | ChainEventRow;

interface EntityExplorerProps {
    catalog: Catalog;
    title: string;
}

function shortId(value: string | undefined): string {
    if (!value) return "-";
    return value.length > 22 ? `${value.slice(0, 22)}..` : value;
}

function jsonPreview(value: string | undefined): string {
    if (!value) return "-";
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
}

const objectColumns: GridColDef<ChainObjectRow>[] = [
    {
        field: "id",
        headerName: "Object ID",
        flex: 1,
        renderCell: (params) => shortId(params.value)
    },
    {
        field: "data_json",
        headerName: "Data",
        flex: 3,
        renderCell: (params) => jsonPreview(params.value)
    },
    {
        field: "updated_at",
        headerName: "Indexed",
        flex: 1,
        renderCell: (params) =>
            params.value
                ? new Date(Number(params.value)).toLocaleString("en-EN", {
                      dateStyle: "medium",
                      timeStyle: "short"
                  })
                : "-"
    }
];

const eventColumns: GridColDef<ChainEventRow>[] = [
    {
        field: "digest",
        headerName: "Digest",
        flex: 1,
        renderCell: (params) => shortId(params.value)
    },
    {
        field: "data_json",
        headerName: "Data",
        flex: 3,
        renderCell: (params) => jsonPreview(params.value)
    },
    {
        field: "created_at",
        headerName: "Created",
        flex: 1,
        renderCell: (params) =>
            params.value
                ? new Date(params.value).toLocaleString("en-EN", {
                      dateStyle: "medium",
                      timeStyle: "short"
                  })
                : "-"
    }
];

// ---- structured JSON detail view ----

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
    if (value === null || value === undefined) {
        return <span className="json-null">null</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return <span className="json-empty">[]</span>;
        }

        return (
            <div className="json-children">
                {value.map((item, i) => (
                    <div className="json-row" key={i} style={{ paddingLeft: depth * 14 }}>
                        <span className="json-key">[{i}]</span>
                        <JsonValue value={item} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);

        if (entries.length === 0) {
            return <span className="json-empty">{"{}"}</span>;
        }

        return (
            <div className="json-children">
                {entries.map(([key, val]) => (
                    <div className="json-row" key={key} style={{ paddingLeft: depth * 14 }}>
                        <span className="json-key">{key}</span>
                        <JsonValue value={val} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    return <JsonScalar value={value} />;
}

function JsonScalar({ value }: { value: unknown }) {
    if (typeof value === "string") {
        return <span className="json-string">{value}</span>;
    }

    if (typeof value === "number") {
        return <span className="json-number">{value}</span>;
    }

    if (typeof value === "boolean") {
        return <span className="json-boolean">{String(value)}</span>;
    }

    return <span>{String(value)}</span>;
}

function JsonValue({ value, depth }: { value: unknown; depth: number }) {
    const isContainer =
        value !== null && typeof value === "object";

    if (!isContainer) {
        return (
            <span className="json-value-inline">
                <JsonScalar value={value} />
            </span>
        );
    }

    return (
        <div className="json-value-block">
            <JsonNode value={value} depth={depth} />
        </div>
    );
}

function EntityDetails({ row }: { row: Row | null }) {
    const parsed = useMemo(() => {
        if (!row?.data_json) return null;

        try {
            return JSON.parse(row.data_json);
        } catch {
            return null;
        }
    }, [row]);

    if (!row) {
        return (
            <div className="entity-details entity-details--empty">
                <p>Select a row to see its full data.</p>
            </div>
        );
    }

    return (
        <div className="entity-details">
            <div className="entity-details-header">
                <span>{"id" in row ? row.id : row.digest}</span>
            </div>

            {parsed === null ? (
                <p className="entity-details-empty">No structured data.</p>
            ) : (
                <div className="json-tree">
                    <JsonNode value={parsed} depth={0} />
                </div>
            )}
        </div>
    );
}

export default function EntityExplorer({ catalog, title }: EntityExplorerProps) {
    const [entityCatalog, setEntityCatalog] = useState<EntityCatalog>({ objects: [], events: [] });
    const [tab, setTab] = useState<Tab>("objects");
    const [selected, setSelected] = useState<EntityInfo | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [selectedRow, setSelectedRow] = useState<Row | null>(null);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const modules = useMemo(
        () =>
            MODULES.filter((m) => m.catalog === catalog).sort((a, b) => a.module.localeCompare(b.module)),
        [catalog]
    );
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const activeModule = modules.find((m) => m.module === selectedModule) ?? null;

    useEffect(() => {
        let cancelled = false;

        setLoadingCatalog(true);
        setSelected(null);
        setRows([]);
        setSelectedRow(null);

        fetchEntities(catalog)
            .then((data) => {
                if (!cancelled) {
                    setEntityCatalog(data);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingCatalog(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [catalog]);

    // Sections of the entity list: game vs technical objects, or events
    // grouped by origin (an event with several origins shows up in each).
    const sections = useMemo(() => {
        const byLabel = (a: EntityInfo, b: EntityInfo) => a.label.localeCompare(b.label);

        if (tab === "objects") {
            return [
                { title: "GAME OBJECTS", items: entityCatalog.objects.filter((e) => !e.technical).sort(byLabel) },
                { title: "TECHNICAL", items: entityCatalog.objects.filter((e) => e.technical).sort(byLabel) }
            ].filter((section) => section.items.length > 0);
        }

        if (tab === "events") {
            const groups = new Map<string, EntityInfo[]>();

            for (const event of entityCatalog.events) {
                for (const group of event.groups?.length ? event.groups : ["Other"]) {
                    groups.set(group, [...(groups.get(group) ?? []), event]);
                }
            }

            return [...groups.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([title, items]) => ({ title: title.toUpperCase(), items: items.sort(byLabel) }));
        }

        return [];
    }, [tab, entityCatalog]);

    useEffect(() => {
        setSelected(null);
        setRows([]);
        setSelectedRow(null);
        setSearchInput("");
        setSearch("");
        setSelectedModule(modules[0]?.module ?? null);
    }, [tab, modules]);

    function select(entity: EntityInfo) {
        setSelected(entity);
        setLoadingRows(true);
        setSelectedRow(null);
        setSearchInput("");
        setSearch("");

        const loader = tab === "objects" ? fetchChainObjects : fetchChainEvents;

        loader(entity.key)
            .then((data) => setRows(data))
            .finally(() => setLoadingRows(false));
    }

    // Debounce so filtering thousands of rows doesn't run on every keystroke.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 200);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return rows;
        }

        return rows.filter((row) => {
            const idField = "id" in row ? row.id : (row as ChainEventRow).digest;

            return (
                idField.toLowerCase().includes(term) ||
                row.data_json?.toLowerCase().includes(term)
            );
        });
    }, [rows, search]);

    const columns = tab === "objects" ? objectColumns : eventColumns;

    const getRowId = useMemo(
        () => (row: Row) =>
            "id" in row ? row.id : `${(row as ChainEventRow).digest}:${(row as ChainEventRow).sequence_number}`,
        []
    );

    const sortedFunctions = useMemo(
        () => (activeModule ? [...activeModule.functions].sort((a, b) => a.name.localeCompare(b.name)) : []),
        [activeModule]
    );

    const filteredFunctions = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return sortedFunctions;

        return sortedFunctions.filter(
            (fn) => fn.name.toLowerCase().includes(term) || fn.doc.toLowerCase().includes(term)
        );
    }, [sortedFunctions, search]);

    return (
        <section className="panel data-panel world-data-panel">
            <h2>{title}</h2>

            <div className="world-data-tabs">
                <button
                    className={tab === "objects" ? "tab-btn tab-btn--active" : "tab-btn"}
                    onClick={() => setTab("objects")}
                >
                    OBJECTS
                </button>

                <button
                    className={tab === "events" ? "tab-btn tab-btn--active" : "tab-btn"}
                    onClick={() => setTab("events")}
                >
                    EVENTS
                </button>

                <button
                    className={tab === "functions" ? "tab-btn tab-btn--active" : "tab-btn"}
                    onClick={() => setTab("functions")}
                >
                    FUNCTIONS
                </button>
            </div>

            {tab === "functions" ? (
                <div className="world-data-layout">
                    <div className="entity-list">
                        {modules.map((mod) => (
                            <button
                                key={mod.module}
                                className={
                                    activeModule?.module === mod.module
                                        ? "entity-row entity-row--active"
                                        : "entity-row"
                                }
                                onClick={() => {
                                    setSelectedModule(mod.module);
                                    setSearchInput("");
                                }}
                            >
                                <span>{mod.module}</span>
                                <span className="entity-count">{mod.functions.length}</span>
                            </button>
                        ))}
                    </div>

                    <div className="entity-main">
                        {activeModule && (
                            <>
                                <p className="function-module-doc">{activeModule.doc}</p>

                                <input
                                    className="search"
                                    placeholder={`Search ${activeModule.module} functions...`}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </>
                        )}

                        <div className="function-list">
                            {!activeModule ? (
                                <div className="loading-panel">
                                    <p>No modules in this catalog.</p>
                                </div>
                            ) : filteredFunctions.length === 0 ? (
                                <div className="loading-panel">
                                    <p>No functions match "{searchInput}".</p>
                                </div>
                            ) : (
                                filteredFunctions.map((fn) => (
                                    <div className="function-card" key={fn.name}>
                                        <div className="function-sig">
                                            <span className="function-name">{fn.name}</span>
                                            <span className="function-params">{fn.signature}</span>
                                            {fn.returns && (
                                                <span className="function-returns"> : {fn.returns}</span>
                                            )}
                                            {fn.signature.includes("AdminACL") && (
                                                <span
                                                    className="tag tag--admin"
                                                    title="Requires an AdminACL reference — not callable from an ordinary player wallet/PTB. Restricted to the sponsor/admin server (e.g. bridging in-game actions like character creation or assembly dismantling on-chain)."
                                                >
                                                    admin only
                                                </span>
                                            )}
                                        </div>
                                        <p className="function-doc">{fn.doc}</p>
                                        {fn.emits && fn.emits.length > 0 && (
                                            <div className="function-emits">
                                                <span className="function-emits-label">emits</span>
                                                {fn.emits.map((event) => (
                                                    <span className="tag tag--event" key={event}>
                                                        {event}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="world-data-layout">
                    <div className="entity-list">
                        {loadingCatalog ? (
                            <div className="loading-panel">
                                <div className="spinner" />
                            </div>
                        ) : (
                            sections.map((section) => (
                                <div className="entity-section" key={section.title}>
                                    <div className="entity-section-title">{section.title}</div>

                                    {section.items.map((entity) => (
                                        <button
                                            key={entity.key}
                                            className={
                                                selected?.key === entity.key
                                                    ? "entity-row entity-row--active"
                                                    : "entity-row"
                                            }
                                            onClick={() => select(entity)}
                                        >
                                            <span>{entity.label}</span>
                                            <span className="entity-count">{entity.count}</span>
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="entity-main">
                        {selected && (
                            <input
                                className="search"
                                placeholder={`Search ${selected.label.toLowerCase()}...`}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        )}

                        <div className="entity-grid">
                            {!selected ? (
                                <div className="loading-panel">
                                    <p>Select an entity to view indexed data.</p>
                                </div>
                            ) : loadingRows ? (
                                <div className="loading-panel">
                                    <div className="spinner" />
                                </div>
                            ) : (
                                <DataGrid
                                    rows={filteredRows}
                                    columns={columns as GridColDef[]}
                                    getRowId={getRowId}
                                    rowHeight={38}
                                    density="compact"
                                    disableColumnMenu
                                    onRowClick={(params: GridRowParams<Row>) =>
                                        setSelectedRow(params.row)
                                    }
                                    initialState={{
                                        pagination: {
                                            paginationModel: { pageSize: 100 }
                                        }
                                    }}
                                    pageSizeOptions={[100]}
                                />
                            )}
                        </div>

                        {selected && <EntityDetails row={selectedRow} />}
                    </div>
                </div>
            )}
        </section>
    );
}
