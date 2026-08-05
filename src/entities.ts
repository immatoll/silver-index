import {
  SLV_GATE_MODULE,
  SLV_GATE_PACKAGE_ID,
  SLV_SSU_MODULE,
  SLV_SSU_PACKAGE_ID,
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
}

function worldType(module: string, struct: string): string {
  return `${WORLD_PACKAGE_ID}::${module}::${struct}`;
}

function gateType(struct: string): string {
  return `${SLV_GATE_PACKAGE_ID}::${SLV_GATE_MODULE}::${struct}`;
}

function ssuType(struct: string): string {
  return `${SLV_SSU_PACKAGE_ID}::${SLV_SSU_MODULE}::${struct}`;
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
  { key: "admin_acl", type: worldType("access", "AdminACL"), label: "Admin ACL", catalog: "world" },
  {
    key: "server_address_registry",
    type: worldType("access", "ServerAddressRegistry"),
    label: "Server Address Registry",
    catalog: "world",
  },
  { key: "assembly", type: worldType("assembly", "Assembly"), label: "Assembly", catalog: "world" },
  { key: "gate_config", type: worldType("gate", "GateConfig"), label: "Gate Config", catalog: "world" },
  { key: "gate", type: worldType("gate", "Gate"), label: "Gate", catalog: "world" },
  { key: "jump_permit", type: worldType("gate", "JumpPermit"), label: "Jump Permit", catalog: "world" },
  {
    key: "storage_unit",
    type: worldType("storage_unit", "StorageUnit"),
    label: "Storage Unit",
    catalog: "world",
  },
  { key: "turret", type: worldType("turret", "Turret"), label: "Turret", catalog: "world" },
  { key: "character", type: worldType("character", "Character"), label: "Character", catalog: "world" },
  {
    key: "player_profile",
    type: worldType("character", "PlayerProfile"),
    label: "Player Profile",
    catalog: "world",
  },
  { key: "killmail", type: worldType("killmail", "Killmail"), label: "Killmail", catalog: "world" },
  {
    key: "network_node",
    type: worldType("network_node", "NetworkNode"),
    label: "Network Node",
    catalog: "world",
  },
  { key: "energy_config", type: worldType("energy", "EnergyConfig"), label: "Energy Config", catalog: "world" },
  { key: "fuel_config", type: worldType("fuel", "FuelConfig"), label: "Fuel Config", catalog: "world" },
  { key: "item", type: worldType("inventory", "Item"), label: "Item (in transit)", catalog: "world" },
  {
    key: "location_registry",
    type: worldType("location", "LocationRegistry"),
    label: "Location Registry",
    catalog: "world",
  },
  {
    key: "killmail_registry",
    type: worldType("killmail_registry", "KillmailRegistry"),
    label: "Killmail Registry",
    catalog: "world",
  },
  {
    key: "object_registry",
    type: worldType("object_registry", "ObjectRegistry"),
    label: "Object Registry",
    catalog: "world",
  },
  { key: "rift", type: worldType("rift", "Rift"), label: "Rift", catalog: "world" },
  { key: "governor_cap", type: worldType("world", "GovernorCap"), label: "Governor Cap", catalog: "world" },

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
];

export const EVENT_TYPES: EntityDef[] = [
  // ----- world -----
  {
    key: "owner_cap_created",
    type: worldType("access", "OwnerCapCreatedEvent"),
    label: "OwnerCap Created",
    catalog: "world",
  },
  {
    key: "owner_cap_transferred",
    type: worldType("access", "OwnerCapTransferred"),
    label: "OwnerCap Transferred",
    catalog: "world",
  },
  {
    key: "assembly_created",
    type: worldType("assembly", "AssemblyCreatedEvent"),
    label: "Assembly Created",
    catalog: "world",
  },
  {
    key: "extension_config_frozen",
    type: worldType("extension_freeze", "ExtensionConfigFrozenEvent"),
    label: "Extension Config Frozen",
    catalog: "world",
  },
  { key: "gate_created", type: worldType("gate", "GateCreatedEvent"), label: "Gate Created", catalog: "world" },
  { key: "gate_linked", type: worldType("gate", "GateLinkedEvent"), label: "Gate Linked", catalog: "world" },
  { key: "gate_unlinked", type: worldType("gate", "GateUnlinkedEvent"), label: "Gate Unlinked", catalog: "world" },
  { key: "jump", type: worldType("gate", "JumpEvent"), label: "Jump", catalog: "world" },
  {
    key: "jump_permit_issued",
    type: worldType("gate", "JumpPermitIssuedEvent"),
    label: "Jump Permit Issued",
    catalog: "world",
  },
  {
    key: "gate_extension_authorized",
    type: worldType("gate", "ExtensionAuthorizedEvent"),
    label: "Gate Extension Authorized",
    catalog: "world",
  },
  {
    key: "gate_extension_revoked",
    type: worldType("gate", "ExtensionRevokedEvent"),
    label: "Gate Extension Revoked",
    catalog: "world",
  },
  {
    key: "storage_unit_created",
    type: worldType("storage_unit", "StorageUnitCreatedEvent"),
    label: "Storage Unit Created",
    catalog: "world",
  },
  {
    key: "storage_unit_extension_authorized",
    type: worldType("storage_unit", "ExtensionAuthorizedEvent"),
    label: "Storage Unit Extension Authorized",
    catalog: "world",
  },
  {
    key: "storage_unit_extension_revoked",
    type: worldType("storage_unit", "ExtensionRevokedEvent"),
    label: "Storage Unit Extension Revoked",
    catalog: "world",
  },
  { key: "turret_created", type: worldType("turret", "TurretCreatedEvent"), label: "Turret Created", catalog: "world" },
  {
    key: "priority_list_updated",
    type: worldType("turret", "PriorityListUpdatedEvent"),
    label: "Turret Priority List Updated",
    catalog: "world",
  },
  {
    key: "turret_extension_authorized",
    type: worldType("turret", "ExtensionAuthorizedEvent"),
    label: "Turret Extension Authorized",
    catalog: "world",
  },
  {
    key: "turret_extension_revoked",
    type: worldType("turret", "ExtensionRevokedEvent"),
    label: "Turret Extension Revoked",
    catalog: "world",
  },
  {
    key: "character_created",
    type: worldType("character", "CharacterCreatedEvent"),
    label: "Character Created",
    catalog: "world",
  },
  {
    key: "killmail_created",
    type: worldType("killmail", "KillmailCreatedEvent"),
    label: "Killmail Created",
    catalog: "world",
  },
  {
    key: "network_node_created",
    type: worldType("network_node", "NetworkNodeCreatedEvent"),
    label: "Network Node Created",
    catalog: "world",
  },
  {
    key: "energy_production_started",
    type: worldType("energy", "StartEnergyProductionEvent"),
    label: "Energy Production Started",
    catalog: "world",
  },
  {
    key: "energy_production_stopped",
    type: worldType("energy", "StopEnergyProductionEvent"),
    label: "Energy Production Stopped",
    catalog: "world",
  },
  {
    key: "energy_reserved",
    type: worldType("energy", "EnergyReservedEvent"),
    label: "Energy Reserved",
    catalog: "world",
  },
  {
    key: "energy_released",
    type: worldType("energy", "EnergyReleasedEvent"),
    label: "Energy Released",
    catalog: "world",
  },
  {
    key: "fuel_efficiency_set",
    type: worldType("fuel", "FuelEfficiencySetEvent"),
    label: "Fuel Efficiency Set",
    catalog: "world",
  },
  {
    key: "fuel_efficiency_removed",
    type: worldType("fuel", "FuelEfficiencyRemovedEvent"),
    label: "Fuel Efficiency Removed",
    catalog: "world",
  },
  {
    key: "item_deposited",
    type: worldType("inventory", "ItemDepositedEventV2"),
    label: "Item Deposited",
    catalog: "world",
  },
  {
    key: "item_withdrawn",
    type: worldType("inventory", "ItemWithdrawnEventV2"),
    label: "Item Withdrawn",
    catalog: "world",
  },
  {
    key: "location_revealed",
    type: worldType("location", "LocationRevealedEvent"),
    label: "Location Revealed",
    catalog: "world",
  },
  {
    key: "metadata_changed",
    type: worldType("metadata", "MetadataChangedEvent"),
    label: "Metadata Changed",
    catalog: "world",
  },
  {
    key: "status_changed",
    type: worldType("status", "StatusChangedEvent"),
    label: "Status Changed",
    catalog: "world",
  },
  { key: "rift_spawned", type: worldType("rift", "RiftSpawnedEvent"), label: "Rift Spawned", catalog: "world" },
  {
    key: "rift_location_broadcast",
    type: worldType("rift", "RiftLocationBroadcastEvent"),
    label: "Rift Location Broadcast",
    catalog: "world",
  },

  // ----- silverlink -----
  {
    key: "silver_gate_config_event",
    type: gateType("SilverGateConfigEvent"),
    label: "Silver Gate Config Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_gate_whitelist_event",
    type: gateType("SilverGateWhitelistEvent"),
    label: "Silver Gate Whitelist Changed",
    catalog: "silverlink",
  },
  {
    key: "silver_gate_access_event",
    type: gateType("SilverGateAccessEvent"),
    label: "Silver Gate Access",
    catalog: "silverlink",
  },
  {
    key: "ssu_access",
    type: ssuType("SSUAccessEvent"),
    label: "SSU Access",
    catalog: "silverlink",
  },
  {
    key: "ssu_inventory",
    type: ssuType("SSUInventoryEvent"),
    label: "SSU Inventory",
    catalog: "silverlink",
  },
  {
    key: "ssu_config",
    type: ssuType("SSUConfigEvent"),
    label: "SSU Config Changed",
    catalog: "silverlink",
  },
  {
    key: "ssu_whitelist",
    type: ssuType("SSUWhitelistEvent"),
    label: "SSU Whitelist Changed",
    catalog: "silverlink",
  },
];
