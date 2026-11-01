import {
  SLV_GATE_MODULE,
  SLV_GATE_PACKAGE_ID,
  SLV_LOCATION_MODULE,
  SLV_LOCATION_PACKAGE_ID,
  SLV_MARKET_MODULE,
  SLV_MARKET_PACKAGE_ID,
  SLV_SSU_MODULE,
  SLV_SSU_PACKAGE_ID,
  SLV_TOLL_MODULE,
  SLV_TOLL_PACKAGE_ID,
  WORLD_PACKAGE_ID,
} from "./config.js";

export type Catalog = "world" | "silverlink";

export interface EntityDef {
  /** Short stable key used as the sync_state cursor key and db discriminator. */
  key: string;
  /** Fully-qualified Move type, e.g. `${pkg}::module::Struct`. */
  type: string;
  /** Human label for the frontend. */
  label: string;
  /** Which tab this belongs to. */
  catalog: Catalog;
  /** True for an entity that's deliberately excluded from `syncObjects`/
   *  `syncEvents` (see genericSync.ts's own skip check) — still listed by
   *  `/api/entities`/the frontend (as a known type sitting at a permanent
   *  0 count), just never actually fetched. For `world::fuel::FuelEvent`
   *  specifically: six emit sites cover every fuel-source tick across the
   *  whole game, ~21k+ rows in a single sync run and still climbing — a
   *  volume nobody currently needs the raw log of, and by far the largest
   *  single entity in this catalog. Add the reason as a comment next to
   *  the entry, same as this one, whenever this flag is used again. */
  skipSync?: boolean;
  /** Objects only. True for plumbing objects (configs, registries, caps) as
   *  opposed to actual game objects (characters, gates, killmails, ...).
   *  They're near-static singletons, so a normal object sync skips them —
   *  they're only fetched via the dedicated technical sync. */
  technical?: boolean;
  /** Events only. The object(s)/module(s) the event originates from, used
   *  to group the frontend list. An event shared by several objects (e.g.
   *  `MetadataChangedEvent` for characters and assemblies) lists them all
   *  and shows up under each group. */
  groups?: string[];
}

/** Which object entities a `syncObjects` run covers. */
export type ObjectScope = "game" | "technical";

function worldType(module: string, struct: string): string {
  return `${WORLD_PACKAGE_ID}::${module}::${struct}`;
}

function gateType(struct: string): string {
  return `${SLV_GATE_PACKAGE_ID}::${SLV_GATE_MODULE}::${struct}`;
}

function ssuType(struct: string): string {
  return `${SLV_SSU_PACKAGE_ID}::${SLV_SSU_MODULE}::${struct}`;
}

function locationType(struct: string): string {
  return `${SLV_LOCATION_PACKAGE_ID}::${SLV_LOCATION_MODULE}::${struct}`;
}

function tollType(struct: string): string {
  return `${SLV_TOLL_PACKAGE_ID}::${SLV_TOLL_MODULE}::${struct}`;
}

function marketType(struct: string): string {
  return `${SLV_MARKET_PACKAGE_ID}::${SLV_MARKET_MODULE}::${struct}`;
}

/**
 * Every `has key` struct across both the core `world` package and Silver's
 * own extension packages (`silver_gate`, `silver_ssu`), split into two
 * catalogs so the frontend can show "World Data" (base game contract) and
 * "Silver Link" (this project's extensions) as separate tabs. Stored
 * generically as raw JSON blobs — the catalog is too large (~45 event
 * types, ~20 object types) for per-entity parser files to stay
 * maintainable.
 */
export const OBJECT_TYPES: EntityDef[] = [
  // ----- world -----
  {
    key: "admin_acl",
    technical: true,
    type: worldType("access", "AdminACL"),
    label: "Admin ACL",
    catalog: "world",
  },
  {
    key: "server_address_registry",
    technical: true,
    type: worldType("access", "ServerAddressRegistry"),
    label: "Server Address Registry",
    catalog: "world",
  },
  {
    key: "assembly",
    type: worldType("assembly", "Assembly"),
    label: "Assembly",
    catalog: "world",
  },
  {
    key: "gate_config",
    technical: true,
    type: worldType("gate", "GateConfig"),
    label: "Gate Config",
    catalog: "world",
  },
  {
    key: "gate",
    type: worldType("gate", "Gate"),
    label: "Gate",
    catalog: "world",
  },
  {
    key: "jump_permit",
    type: worldType("gate", "JumpPermit"),
    label: "Jump Permit",
    catalog: "world",
  },
  {
    key: "storage_unit",
    type: worldType("storage_unit", "StorageUnit"),
    label: "Storage Unit",
    catalog: "world",
  },
  {
    key: "turret",
    type: worldType("turret", "Turret"),
    label: "Turret",
    catalog: "world",
  },
  {
    key: "character",
    type: worldType("character", "Character"),
    label: "Character",
    catalog: "world",
  },
  {
    key: "player_profile",
    type: worldType("character", "PlayerProfile"),
    label: "Player Profile",
    catalog: "world",
  },
  {
    key: "killmail",
    type: worldType("killmail", "Killmail"),
    label: "Killmail",
    catalog: "world",
  },
  {
    key: "network_node",
    type: worldType("network_node", "NetworkNode"),
    label: "Network Node",
    catalog: "world",
  },
  {
    key: "energy_config",
    technical: true,
    type: worldType("energy", "EnergyConfig"),
    label: "Energy Config",
    catalog: "world",
  },
  {
    key: "fuel_config",
    technical: true,
    type: worldType("fuel", "FuelConfig"),
    label: "Fuel Config",
    catalog: "world",
  },
  {
    key: "item",
    type: worldType("inventory", "Item"),
    label: "Item (in transit)",
    catalog: "world",
  },
  {
    key: "location_registry",
    technical: true,
    type: worldType("location", "LocationRegistry"),
    label: "Location Registry",
    catalog: "world",
  },
  {
    key: "killmail_registry",
    technical: true,
    type: worldType("killmail_registry", "KillmailRegistry"),
    label: "Killmail Registry",
    catalog: "world",
  },
  {
    key: "object_registry",
    technical: true,
    type: worldType("object_registry", "ObjectRegistry"),
    label: "Object Registry",
    catalog: "world",
  },
  {
    key: "rift",
    type: worldType("rift", "Rift"),
    label: "Rift",
    catalog: "world",
  },
  {
    key: "governor_cap",
    technical: true,
    type: worldType("world", "GovernorCap"),
    label: "Governor Cap",
    catalog: "world",
  },

  // ----- silverlink -----
  {
    key: "silver_gate_config",
    type: gateType("SilverGateConfig"),
    label: "Silver Gate Config",
    catalog: "silverlink",
  },
  {
    key: "silver_ssu_config",
    type: ssuType("SilverSSUConfig"),
    label: "Silver SSU Config",
    catalog: "silverlink",
  },
  {
    // Generic over the assembly type (`silver_location::LocationAllowlist<T>`
    // — any type with a `world::access::OwnerCap<T>`); the only concrete
    // instantiation the app currently creates is `<NetworkNode>`, so that's
    // what's indexed here. If a future assembly kind gets its own location
    // allowlist, add a second entry with that type argument.
    key: "silver_location_allowlist_network_node",
    type: `${locationType("LocationAllowlist")}<${worldType("network_node", "NetworkNode")}>`,
    label: "Location Allowlist (Network Node)",
    catalog: "silverlink",
  },
  {
    key: "silver_toll_config",
    type: tollType("SilverTollConfig"),
    label: "Silver Toll Config",
    catalog: "silverlink",
  },
  {
    key: "silver_market_config",
    type: marketType("SilverMarketConfig"),
    label: "Silver Market Config",
    catalog: "silverlink",
  },
];

export const EVENT_TYPES: EntityDef[] = [
  // ----- world -----
  {
    key: "owner_cap_created",
    groups: ["Access"],
    type: worldType("access", "OwnerCapCreatedEvent"),
    label: "OwnerCap Created",
    catalog: "world",
  },
  {
    key: "owner_cap_transferred",
    groups: ["Access"],
    type: worldType("access", "OwnerCapTransferred"),
    label: "OwnerCap Transferred",
    catalog: "world",
  },
  {
    key: "assembly_created",
    groups: ["Assembly"],
    type: worldType("assembly", "AssemblyCreatedEvent"),
    label: "Assembly Created",
    catalog: "world",
  },
  {
    key: "extension_config_frozen",
    groups: ["Gate", "Storage Unit", "Turret"],
    type: worldType("extension_freeze", "ExtensionConfigFrozenEvent"),
    label: "Extension Config Frozen",
    catalog: "world",
  },
  {
    key: "gate_created",
    groups: ["Gate"],
    type: worldType("gate", "GateCreatedEvent"),
    label: "Gate Created",
    catalog: "world",
  },
  {
    key: "gate_linked",
    groups: ["Gate"],
    type: worldType("gate", "GateLinkedEvent"),
    label: "Gate Linked",
    catalog: "world",
  },
  {
    key: "gate_unlinked",
    groups: ["Gate"],
    type: worldType("gate", "GateUnlinkedEvent"),
    label: "Gate Unlinked",
    catalog: "world",
  },
  {
    key: "jump",
    groups: ["Gate"],
    type: worldType("gate", "JumpEvent"),
    label: "Jump",
    catalog: "world",
  },
  {
    key: "jump_permit_issued",
    groups: ["Gate", "Jump Permit"],
    type: worldType("gate", "JumpPermitIssuedEvent"),
    label: "Jump Permit Issued",
    catalog: "world",
  },
  {
    key: "gate_extension_authorized",
    groups: ["Gate"],
    type: worldType("gate", "ExtensionAuthorizedEvent"),
    label: "Gate Extension Authorized",
    catalog: "world",
  },
  {
    key: "gate_extension_revoked",
    groups: ["Gate"],
    type: worldType("gate", "ExtensionRevokedEvent"),
    label: "Gate Extension Revoked",
    catalog: "world",
  },
  {
    key: "storage_unit_created",
    groups: ["Storage Unit"],
    type: worldType("storage_unit", "StorageUnitCreatedEvent"),
    label: "Storage Unit Created",
    catalog: "world",
  },
  {
    key: "storage_unit_extension_authorized",
    groups: ["Storage Unit"],
    type: worldType("storage_unit", "ExtensionAuthorizedEvent"),
    label: "Storage Unit Extension Authorized",
    catalog: "world",
  },
  {
    key: "storage_unit_extension_revoked",
    groups: ["Storage Unit"],
    type: worldType("storage_unit", "ExtensionRevokedEvent"),
    label: "Storage Unit Extension Revoked",
    catalog: "world",
  },
  {
    key: "turret_created",
    groups: ["Turret"],
    type: worldType("turret", "TurretCreatedEvent"),
    label: "Turret Created",
    catalog: "world",
  },
  {
    key: "priority_list_updated",
    groups: ["Turret"],
    type: worldType("turret", "PriorityListUpdatedEvent"),
    label: "Turret Priority List Updated",
    catalog: "world",
  },
  {
    key: "turret_extension_authorized",
    groups: ["Turret"],
    type: worldType("turret", "ExtensionAuthorizedEvent"),
    label: "Turret Extension Authorized",
    catalog: "world",
  },
  {
    key: "turret_extension_revoked",
    groups: ["Turret"],
    type: worldType("turret", "ExtensionRevokedEvent"),
    label: "Turret Extension Revoked",
    catalog: "world",
  },
  {
    key: "character_created",
    groups: ["Character"],
    type: worldType("character", "CharacterCreatedEvent"),
    label: "Character Created",
    catalog: "world",
  },
  {
    key: "killmail_created",
    groups: ["Killmail"],
    type: worldType("killmail", "KillmailCreatedEvent"),
    label: "Killmail Created",
    catalog: "world",
  },
  {
    key: "network_node_created",
    groups: ["Network Node"],
    type: worldType("network_node", "NetworkNodeCreatedEvent"),
    label: "Network Node Created",
    catalog: "world",
  },
  {
    key: "energy_production_started",
    groups: ["Network Node"],
    type: worldType("energy", "StartEnergyProductionEvent"),
    label: "Energy Production Started",
    catalog: "world",
  },
  {
    key: "energy_production_stopped",
    groups: ["Network Node"],
    type: worldType("energy", "StopEnergyProductionEvent"),
    label: "Energy Production Stopped",
    catalog: "world",
  },
  {
    key: "energy_reserved",
    groups: ["Network Node"],
    type: worldType("energy", "EnergyReservedEvent"),
    label: "Energy Reserved",
    catalog: "world",
  },
  {
    key: "energy_released",
    groups: ["Network Node"],
    type: worldType("energy", "EnergyReleasedEvent"),
    label: "Energy Released",
    catalog: "world",
  },
  {
    key: "fuel_efficiency_set",
    groups: ["Network Node"],
    type: worldType("fuel", "FuelEfficiencySetEvent"),
    label: "Fuel Efficiency Set",
    catalog: "world",
  },
  {
    key: "fuel_efficiency_removed",
    groups: ["Network Node"],
    type: worldType("fuel", "FuelEfficiencyRemovedEvent"),
    label: "Fuel Efficiency Removed",
    catalog: "world",
  },
  {
    // Six emit sites in fuel.move (production start/stop, reserve/release,
    // efficiency changes, deletion) — a lower-level per-fuel-source log
    // than the four Fuel*/Energy* events above, which cover the
    // higher-level assembly-facing actions. skipSync: true per explicit
    // request — confirmed in practice as ~21k+ rows and still climbing in
    // a single sync run, dwarfing every other entity in this catalog, for
    // data nobody currently needs. Still listed here (and by
    // /api/entities/the frontend) as a known type sitting at a permanent
    // 0 count, just never fetched — see skipSync's own doc comment.
    key: "fuel_event",
    groups: ["Network Node"],
    type: worldType("fuel", "FuelEvent"),
    label: "Fuel Changed",
    catalog: "world",
    skipSync: true,
  },
  {
    key: "item_deposited",
    groups: ["Storage Unit", "Item"],
    type: worldType("inventory", "ItemDepositedEventV2"),
    label: "Item Deposited",
    catalog: "world",
  },
  {
    key: "item_withdrawn",
    groups: ["Storage Unit", "Item"],
    type: worldType("inventory", "ItemWithdrawnEventV2"),
    label: "Item Withdrawn",
    catalog: "world",
  },
  {
    key: "item_minted",
    groups: ["Storage Unit", "Item"],
    type: worldType("inventory", "ItemMintedEvent"),
    label: "Item Minted",
    catalog: "world",
  },
  {
    key: "item_burned",
    groups: ["Storage Unit", "Item"],
    type: worldType("inventory", "ItemBurnedEvent"),
    label: "Item Burned",
    catalog: "world",
  },
  {
    key: "item_destroyed",
    groups: ["Storage Unit", "Item"],
    type: worldType("inventory", "ItemDestroyedEvent"),
    label: "Item Destroyed",
    catalog: "world",
  },
  {
    key: "location_revealed",
    groups: ["Assembly"],
    type: worldType("location", "LocationRevealedEvent"),
    label: "Location Revealed",
    catalog: "world",
  },
  {
    key: "metadata_changed",
    groups: ["Character", "Assembly"],
    type: worldType("metadata", "MetadataChangedEvent"),
    label: "Metadata Changed",
    catalog: "world",
  },
  {
    key: "status_changed",
    groups: ["Assembly"],
    type: worldType("status", "StatusChangedEvent"),
    label: "Status Changed",
    catalog: "world",
  },
  {
    key: "rift_spawned",
    groups: ["Rift"],
    type: worldType("rift", "RiftSpawnedEvent"),
    label: "Rift Spawned",
    catalog: "world",
  },
  {
    key: "rift_location_broadcast",
    groups: ["Rift"],
    type: worldType("rift", "RiftLocationBroadcastEvent"),
    label: "Rift Location Broadcast",
    catalog: "world",
  },

  // ----- silverlink -----
  {
    key: "silver_gate_config_event",
    groups: ["Silver Gate"],
    type: gateType("SilverGateConfigEvent"),
    label: "Silver Gate Config Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_gate_whitelist_event",
    groups: ["Silver Gate"],
    type: gateType("SilverGateWhitelistEvent"),
    label: "Silver Gate Whitelist Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_gate_access_event",
    groups: ["Silver Gate"],
    type: gateType("SilverGateAccessEvent"),
    label: "Silver Gate Access",
    catalog: "silverlink",
  },
  {
    key: "ssu_access",
    groups: ["Silver SSU"],
    type: ssuType("SSUAccessEvent"),
    label: "SSU Access",
    catalog: "silverlink",
  },
  {
    key: "ssu_inventory",
    groups: ["Silver SSU"],
    type: ssuType("SSUInventoryEvent"),
    label: "SSU Inventory",
    catalog: "silverlink",
  },
  {
    key: "ssu_config",
    groups: ["Silver SSU"],
    type: ssuType("SSUConfigEvent"),
    label: "SSU Config Changed",
    catalog: "silverlink",
  },
  {
    key: "ssu_whitelist",
    groups: ["Silver SSU"],
    type: ssuType("SSUWhitelistEvent"),
    label: "SSU Whitelist Changed",
    catalog: "silverlink",
  },
  {
    // Non-generic (the event struct itself carries no type parameter, even
    // though the allowlist it describes is generic) — one event type
    // covers every assembly kind's location allowlist activity.
    key: "location_allowlist_event",
    groups: ["Location Allowlist"],
    type: locationType("LocationAllowlistEvent"),
    label: "Location Allowlist Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_toll_config_event",
    groups: ["Silver Toll"],
    type: tollType("SilverTollConfigEvent"),
    label: "Silver Toll Config Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_toll_rate_event",
    groups: ["Silver Toll"],
    type: tollType("SilverTollRateEvent"),
    label: "Silver Toll Rate Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_toll_payment_event",
    groups: ["Silver Toll"],
    type: tollType("SilverTollPaymentEvent"),
    label: "Silver Toll Payment",
    catalog: "silverlink",
  },
  {
    key: "silver_market_access_event",
    groups: ["Silver Market"],
    type: marketType("MarketAccessEvent"),
    label: "Silver Market Access",
    catalog: "silverlink",
  },
  {
    key: "silver_market_config_event",
    groups: ["Silver Market"],
    type: marketType("MarketConfigEvent"),
    label: "Silver Market Config Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_market_whitelist_event",
    groups: ["Silver Market"],
    type: marketType("MarketWhitelistEvent"),
    label: "Silver Market Whitelist Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_market_listing_added_event",
    groups: ["Silver Market"],
    type: marketType("ListingAddedEvent"),
    label: "Silver Market Listing Added",
    catalog: "silverlink",
  },
  {
    key: "silver_market_listing_price_updated_event",
    groups: ["Silver Market"],
    type: marketType("ListingPriceUpdatedEvent"),
    label: "Silver Market Listing Price Updated",
    catalog: "silverlink",
  },
  {
    key: "silver_market_listing_removed_event",
    groups: ["Silver Market"],
    type: marketType("ListingRemovedEvent"),
    label: "Silver Market Listing Removed",
    catalog: "silverlink",
  },
  {
    key: "silver_market_purchase_event",
    groups: ["Silver Market"],
    type: marketType("MarketPurchaseEvent"),
    label: "Silver Market Purchase",
    catalog: "silverlink",
  },
];
