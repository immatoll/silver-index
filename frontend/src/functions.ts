import type { Catalog } from "./api";

export interface FunctionDef {
    /** Function name as declared in Move. */
    name: string;
    /** Parameter list as written in the source, without types collapsed. */
    signature: string;
    /** Return type, if any (omitted for functions with no return value). */
    returns?: string;
    /** Doc comment / description, condensed to plain text. */
    doc: string;
}

export interface ModuleDef {
    /** Move module path, e.g. `world::gate`. */
    module: string;
    /** One-line summary of what the module is for. */
    doc: string;
    catalog: Catalog;
    functions: FunctionDef[];
}

/**
 * Hand-maintained reference of the callable (state-changing / action) public functions
 * across the World contract and Silver Link's own extension packages. Pure getters and
 * package-private helpers are intentionally omitted — this is a library of things you'd
 * actually call from a script or PTB, not a full API dump.
 *
 * Source: civ-control/vendor/world-contracts/contracts/world (World), silver-link/move/silver_gate
 * and silver-link/move/silver_ssu (Silver Link). Keep in sync manually when those contracts change.
 */
export const MODULES: ModuleDef[] = [
    // ================= World =================
    {
        module: "world::access",
        doc: "Capability-based access control: GovernorCap, AdminACL (sponsors), OwnerCap (per-object mutation rights).",
        catalog: "world",
        functions: [
            { name: "transfer_owner_cap", signature: "<T: key>(owner_cap: OwnerCap<T>, owner: address)", doc: "Transfers an OwnerCap to a new owner. Character caps cannot be transferred this way." },
            { name: "transfer_owner_cap_to_address", signature: "<T: key>(owner_cap: OwnerCap<T>, new_owner: address, ctx: &mut TxContext)", doc: "Transfers an OwnerCap to an address. Rejects OwnerCap<Character>." },
            { name: "return_owner_cap_to_object", signature: "<T: key>(owner_cap: OwnerCap<T>, receipt: ReturnOwnerCapReceipt, owner_id: address)", doc: "Returns a borrowed OwnerCap to the object it was borrowed from, consuming the receipt." },
            { name: "transfer_owner_cap_with_receipt", signature: "<T: key>(owner_cap: OwnerCap<T>, receipt: ReturnOwnerCapReceipt, new_owner: address, ctx: &mut TxContext)", doc: "Transfers a borrowed owner cap to an address, consuming the return receipt." },
            { name: "receive_owner_cap", signature: "<T: key>(receiving_id: &mut UID, ticket: Receiving<OwnerCap<T>>)", returns: "OwnerCap<T>", doc: "Receives an OwnerCap<T> from a Receiving ticket (transfer-to-object pattern)." },
            { name: "add_sponsor_to_acl", signature: "(admin_acl: &mut AdminACL, _: &GovernorCap, sponsor: address)", doc: "Admin: authorizes a sponsor address in the AdminACL." },
            { name: "create_owner_cap", signature: "<T: key>(admin_acl: &AdminACL, obj: &T, ctx: &mut TxContext)", returns: "OwnerCap<T>", doc: "Sponsor-only: mints a new OwnerCap authorized for the given object." },
            { name: "create_owner_cap_by_id", signature: "<T: key>(object_id: ID, admin_acl: &AdminACL, ctx: &mut TxContext)", returns: "OwnerCap<T>", doc: "Sponsor-only: mints a new OwnerCap authorized for an object ID (used before the object exists)." },
            { name: "register_server_address", signature: "(server_address_registry: &mut ServerAddressRegistry, _: &GovernorCap, server_address: address)", doc: "Governor-only: authorizes a server address for signing location proofs." },
            { name: "remove_server_address", signature: "(server_address_registry: &mut ServerAddressRegistry, _: &GovernorCap, server_address: address)", doc: "Governor-only: revokes an authorized server address." },
            { name: "delete_owner_cap", signature: "<T: key>(owner_cap: OwnerCap<T>, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Sponsor-only: destroys an OwnerCap." },
        ],
    },
    {
        module: "world::assembly",
        doc: "Generic assembly lifecycle: anchor, unanchor, online, offline.",
        catalog: "world",
        functions: [
            { name: "online", signature: "(assembly: &mut Assembly, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Assembly>)", doc: "Brings an anchored assembly online, reserving energy from its network node." },
            { name: "offline", signature: "(assembly: &mut Assembly, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Assembly>)", doc: "Brings an online assembly offline, releasing reserved energy." },
            { name: "update_metadata_name", signature: "(assembly: &mut Assembly, owner_cap: &OwnerCap<Assembly>, name: String)", doc: "Owner: updates the assembly's display name." },
            { name: "update_metadata_description", signature: "(assembly: &mut Assembly, owner_cap: &OwnerCap<Assembly>, description: String)", doc: "Owner: updates the assembly's description." },
            { name: "update_metadata_url", signature: "(assembly: &mut Assembly, owner_cap: &OwnerCap<Assembly>, url: String)", doc: "Owner: updates the assembly's URL." },
            { name: "reveal_location", signature: "(assembly: &Assembly, registry: &mut LocationRegistry, admin_acl: &AdminACL, solarsystem: u64, x: String, y: String, z: String, ctx: &TxContext)", doc: "Admin ACL only: reveals plain-text coordinates for this assembly in the LocationRegistry." },
            { name: "anchor", signature: "(registry: &mut ObjectRegistry, network_node: &mut NetworkNode, character: &Character, admin_acl: &AdminACL, item_id: u64, type_id: u64, location_hash: vector<u8>, ctx: &mut TxContext)", returns: "Assembly", doc: "Admin: creates a new Assembly, derives its ID, mints its OwnerCap, and connects it to a network node." },
            { name: "share_assembly", signature: "(assembly: Assembly, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly anchored Assembly object." },
            { name: "update_energy_source", signature: "(assembly: &mut Assembly, network_node: &mut NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: re-points the assembly's energy source to a different network node (must be offline)." },
            { name: "update_energy_source_connected_assembly", signature: "(assembly: &mut Assembly, update_energy_sources: UpdateEnergySources, network_node: &NetworkNode)", returns: "UpdateEnergySources", doc: "Consumes one entry of the UpdateEnergySources hot potato from network_node::connect_assemblies." },
            { name: "offline_connected_assembly", signature: "(assembly: &mut Assembly, offline_assemblies: OfflineAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "OfflineAssemblies", doc: "Consumes one entry of the OfflineAssemblies hot potato from network_node::offline." },
            { name: "offline_orphaned_assembly", signature: "(assembly: &mut Assembly, orphaned_assemblies: HandleOrphanedAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "HandleOrphanedAssemblies", doc: "Consumes one entry of the HandleOrphanedAssemblies hot potato from network_node::unanchor." },
            { name: "unanchor", signature: "(assembly: Assembly, network_node: &mut NetworkNode, energy_config: &EnergyConfig, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys a connected Assembly, disconnecting it from its network node." },
            { name: "unanchor_orphan", signature: "(assembly: Assembly, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys an already-disconnected (orphaned) Assembly." },
        ],
    },
    {
        module: "world::gate",
        doc: "Smart Gates: linking, jumping (with optional permit-based extension access), energy, metadata.",
        catalog: "world",
        functions: [
            { name: "authorize_extension", signature: "<Auth: drop>(gate: &mut Gate, owner_cap: &OwnerCap<Gate>)", doc: "Owner: configures the gate to require permits validated by the given extension witness type." },
            { name: "freeze_extension_config", signature: "(gate: &mut Gate, owner_cap: &OwnerCap<Gate>)", doc: "Owner: permanently locks the gate's extension config. Irreversible." },
            { name: "revoke_extension_authorization", signature: "(gate: &mut Gate, owner_cap: &OwnerCap<Gate>)", doc: "Owner: clears extension authorization, restoring default (permit-less) jump behaviour. Not allowed after freeze." },
            { name: "online", signature: "(gate: &mut Gate, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Gate>)", doc: "Brings the gate online, reserving energy." },
            { name: "offline", signature: "(gate: &mut Gate, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Gate>)", doc: "Brings the gate offline, releasing energy." },
            { name: "link_gates", signature: "(source_gate: &mut Gate, destination_gate: &mut Gate, gate_config: &GateConfig, server_registry: &ServerAddressRegistry, admin_acl: &AdminACL, source_gate_owner_cap: &OwnerCap<Gate>, destination_gate_owner_cap: &OwnerCap<Gate>, distance_proof: vector<u8>, clock: &Clock, ctx: &mut TxContext)", doc: "Links two same-type, unlinked gates after verifying a distance proof. Sponsored transaction only." },
            { name: "unlink_gates", signature: "(source_gate: &mut Gate, destination_gate: &mut Gate, source_gate_owner_cap: &OwnerCap<Gate>, destination_gate_owner_cap: &OwnerCap<Gate>)", doc: "Owner of both gates: unlinks two linked gates." },
            { name: "issue_jump_permit", signature: "<Auth: drop>(source_gate: &Gate, destination_gate: &Gate, character: &Character, auth: Auth, expires_at_timestamp_ms: u64, ctx: &mut TxContext)", doc: "Mints and transfers a JumpPermit to the character's address (extension-gated)." },
            { name: "issue_jump_permit_with_id", signature: "<Auth: drop>(source_gate: &Gate, destination_gate: &Gate, character: &Character, auth: Auth, expires_at_timestamp_ms: u64, ctx: &mut TxContext)", returns: "ID", doc: "Same as issue_jump_permit but also returns the new permit's object ID." },
            { name: "delete_jump_permit", signature: "(jump_permit: JumpPermit)", doc: "Owner: destroys a JumpPermit." },
            { name: "delete_jump_permit_with_auth", signature: "<Auth: drop>(source_gate: &Gate, jump_permit: JumpPermit, _: Auth)", doc: "Destroys a JumpPermit using the extension's Auth witness." },
            { name: "jump", signature: "(source_gate: &Gate, destination_gate: &Gate, character: &Character, admin_acl: &AdminACL, ctx: &mut TxContext)", doc: "Default jump between linked gates. Only allowed when no extension is configured." },
            { name: "jump_with_permit", signature: "(source_gate: &Gate, destination_gate: &Gate, character: &Character, jump_permit: JumpPermit, admin_acl: &AdminACL, clock: &Clock, ctx: &mut TxContext)", doc: "Jumps using a valid JumpPermit; requires extension logic to be configured." },
            { name: "update_energy_source_connected_gate", signature: "(gate: &mut Gate, update_energy_sources: UpdateEnergySources, network_node: &NetworkNode)", returns: "UpdateEnergySources", doc: "Consumes one entry of the UpdateEnergySources hot potato." },
            { name: "offline_connected_gate", signature: "(gate: &mut Gate, offline_assemblies: OfflineAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "OfflineAssemblies", doc: "Consumes one entry of the OfflineAssemblies hot potato." },
            { name: "offline_orphaned_gate", signature: "(gate: &mut Gate, orphaned_assemblies: HandleOrphanedAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "HandleOrphanedAssemblies", doc: "Consumes one entry of the HandleOrphanedAssemblies hot potato." },
            { name: "update_metadata_name", signature: "(gate: &mut Gate, owner_cap: &OwnerCap<Gate>, name: String)", doc: "Owner: updates the gate's display name." },
            { name: "update_metadata_description", signature: "(gate: &mut Gate, owner_cap: &OwnerCap<Gate>, description: String)", doc: "Owner: updates the gate's description." },
            { name: "update_metadata_url", signature: "(gate: &mut Gate, owner_cap: &OwnerCap<Gate>, url: String)", doc: "Owner: updates the gate's URL." },
            { name: "reveal_location", signature: "(gate: &Gate, registry: &mut LocationRegistry, admin_acl: &AdminACL, solarsystem: u64, x: String, y: String, z: String, ctx: &TxContext)", doc: "Admin ACL only: reveals plain-text coordinates for this gate." },
            { name: "anchor", signature: "(registry: &mut ObjectRegistry, network_node: &mut NetworkNode, character: &Character, admin_acl: &AdminACL, item_id: u64, type_id: u64, location_hash: vector<u8>, ctx: &mut TxContext)", returns: "Gate", doc: "Admin: creates a new Gate." },
            { name: "share_gate", signature: "(gate: Gate, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly anchored Gate object." },
            { name: "update_energy_source", signature: "(gate: &mut Gate, network_node: &mut NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: re-points the gate's energy source (must be offline)." },
            { name: "unanchor", signature: "(gate: Gate, network_node: &mut NetworkNode, energy_config: &EnergyConfig, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys a connected, unlinked Gate." },
            { name: "unanchor_orphan", signature: "(gate: Gate, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys an orphaned, unlinked Gate." },
            { name: "unlink_and_unanchor", signature: "(source_gate: Gate, destination_gate: &mut Gate, network_node: &mut NetworkNode, energy_config: &EnergyConfig, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: unlinks then unanchors a connected gate in one call." },
            { name: "unlink_and_unanchor_orphan", signature: "(source_gate: Gate, destination_gate: &mut Gate, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: unlinks then unanchors an orphaned gate in one call." },
            { name: "set_max_distance", signature: "(gate_config: &mut GateConfig, admin_acl: &AdminACL, type_id: u64, max_distance: u64, ctx: &TxContext)", doc: "Admin: sets the max link distance allowed for a gate type_id." },
            { name: "unlink_gates_by_admin", signature: "(source_gate: &mut Gate, destination_gate: &mut Gate, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: force-unlinks two gates without owner caps." },
        ],
    },
    {
        module: "world::storage_unit",
        doc: "Programmable Storage Units: owner/extension-gated deposit & withdraw across main, open, and owned inventories.",
        catalog: "world",
        functions: [
            { name: "authorize_extension", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>)", doc: "Owner: configures the storage unit to route deposit/withdraw through the given extension." },
            { name: "freeze_extension_config", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>)", doc: "Owner: permanently locks the extension config. Irreversible." },
            { name: "revoke_extension_authorization", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>)", doc: "Owner: clears extension authorization. Not allowed after freeze." },
            { name: "online", signature: "(storage_unit: &mut StorageUnit, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<StorageUnit>)", doc: "Brings the storage unit online, reserving energy." },
            { name: "offline", signature: "(storage_unit: &mut StorageUnit, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<StorageUnit>)", doc: "Brings the storage unit offline, releasing energy." },
            { name: "chain_item_to_game_inventory", signature: "<T: key>(storage_unit: &mut StorageUnit, server_registry: &ServerAddressRegistry, character: &Character, owner_cap: &OwnerCap<T>, type_id: u64, quantity: u32, location_proof: vector<u8>, clock: &Clock, ctx: &mut TxContext)", doc: "Bridges items from on-chain storage back to the game, burning them on-chain (proximity-proof gated)." },
            { name: "deposit_item", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, character: &Character, item: Item, _: Auth, _: &mut TxContext)", doc: "Extension-only: deposits a transit Item into the main inventory." },
            { name: "withdraw_item", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, character: &Character, _: Auth, type_id: u64, quantity: u32, ctx: &mut TxContext)", returns: "Item", doc: "Extension-only: withdraws items from the main inventory as a transit Item." },
            { name: "deposit_to_open_inventory", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, character: &Character, item: Item, _: Auth, _: &mut TxContext)", doc: "Extension-only: deposits into the contract-controlled open inventory slot." },
            { name: "withdraw_from_open_inventory", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, character: &Character, _: Auth, type_id: u64, quantity: u32, ctx: &mut TxContext)", returns: "Item", doc: "Extension-only: withdraws from the open inventory slot." },
            { name: "deposit_to_owned", signature: "<Auth: drop>(storage_unit: &mut StorageUnit, character: &Character, item: Item, _: Auth, _: &mut TxContext)", doc: "Extension-only: pushes an item into a player's owned inventory slot (recipient need not be the sender)." },
            { name: "deposit_by_owner", signature: "<T: key>(storage_unit: &mut StorageUnit, item: Item, character: &Character, owner_cap: &OwnerCap<T>, ctx: &mut TxContext)", doc: "Owner-direct: deposits into their own inventory slot." },
            { name: "withdraw_by_owner", signature: "<T: key>(storage_unit: &mut StorageUnit, character: &Character, owner_cap: &OwnerCap<T>, type_id: u64, quantity: u32, ctx: &mut TxContext)", returns: "Item", doc: "Owner-direct: withdraws from their own inventory slot." },
            { name: "update_metadata_name", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>, name: String)", doc: "Owner: updates the storage unit's display name." },
            { name: "update_metadata_description", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>, description: String)", doc: "Owner: updates the storage unit's description." },
            { name: "update_metadata_url", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>, url: String)", doc: "Owner: updates the storage unit's URL." },
            { name: "reveal_location", signature: "(storage_unit: &StorageUnit, registry: &mut LocationRegistry, admin_acl: &AdminACL, solarsystem: u64, x: String, y: String, z: String, ctx: &TxContext)", doc: "Admin ACL only: reveals plain-text coordinates for this storage unit." },
            { name: "anchor", signature: "(registry: &mut ObjectRegistry, network_node: &mut NetworkNode, character: &Character, admin_acl: &AdminACL, item_id: u64, type_id: u64, max_capacity: u64, location_hash: vector<u8>, ctx: &mut TxContext)", returns: "StorageUnit", doc: "Admin: creates a new StorageUnit with owner and open inventory slots." },
            { name: "share_storage_unit", signature: "(storage_unit: StorageUnit, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly anchored StorageUnit object." },
            { name: "update_energy_source", signature: "(storage_unit: &mut StorageUnit, network_node: &mut NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: re-points the storage unit's energy source (must be offline)." },
            { name: "update_energy_source_connected_storage_unit", signature: "(storage_unit: &mut StorageUnit, update_energy_sources: UpdateEnergySources, network_node: &NetworkNode)", returns: "UpdateEnergySources", doc: "Consumes one entry of the UpdateEnergySources hot potato." },
            { name: "offline_connected_storage_unit", signature: "(storage_unit: &mut StorageUnit, offline_assemblies: OfflineAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "OfflineAssemblies", doc: "Consumes one entry of the OfflineAssemblies hot potato." },
            { name: "offline_orphaned_storage_unit", signature: "(storage_unit: &mut StorageUnit, orphaned_assemblies: HandleOrphanedAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "HandleOrphanedAssemblies", doc: "Consumes one entry of the HandleOrphanedAssemblies hot potato." },
            { name: "unanchor", signature: "(storage_unit: StorageUnit, network_node: &mut NetworkNode, energy_config: &EnergyConfig, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys a connected StorageUnit, burning remaining inventory items." },
            { name: "unanchor_orphan", signature: "(storage_unit: StorageUnit, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys an orphaned StorageUnit." },
            { name: "game_item_to_chain_inventory", signature: "<T: key>(storage_unit: &mut StorageUnit, admin_acl: &AdminACL, character: &Character, owner_cap: &OwnerCap<T>, item_id: u64, type_id: u64, volume: u64, quantity: u32, ctx: &mut TxContext)", doc: "Admin/sponsored: mints items from the game into a character's owned on-chain inventory." },
        ],
    },
    {
        module: "world::turret",
        doc: "Programmable Smart Turrets: targeting priority list, extension-configurable rules, energy, metadata.",
        catalog: "world",
        functions: [
            { name: "authorize_extension", signature: "<Auth: drop>(turret: &mut Turret, owner_cap: &OwnerCap<Turret>)", doc: "Owner: configures the turret to resolve target priority via the given extension." },
            { name: "freeze_extension_config", signature: "(turret: &mut Turret, owner_cap: &OwnerCap<Turret>)", doc: "Owner: permanently locks the extension config. Irreversible." },
            { name: "revoke_extension_authorization", signature: "(turret: &mut Turret, owner_cap: &OwnerCap<Turret>)", doc: "Owner: clears extension authorization, restoring default targeting rules." },
            { name: "online", signature: "(turret: &mut Turret, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Turret>)", doc: "Brings the turret online, reserving energy." },
            { name: "offline", signature: "(turret: &mut Turret, network_node: &mut NetworkNode, energy_config: &EnergyConfig, owner_cap: &OwnerCap<Turret>)", doc: "Brings the turret offline, releasing energy." },
            { name: "update_energy_source_connected_turret", signature: "(turret: &mut Turret, update_energy_sources: UpdateEnergySources, network_node: &NetworkNode)", returns: "UpdateEnergySources", doc: "Consumes one entry of the UpdateEnergySources hot potato." },
            { name: "offline_connected_turret", signature: "(turret: &mut Turret, offline_assemblies: OfflineAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "OfflineAssemblies", doc: "Consumes one entry of the OfflineAssemblies hot potato." },
            { name: "offline_orphaned_turret", signature: "(turret: &mut Turret, orphaned_assemblies: HandleOrphanedAssemblies, network_node: &mut NetworkNode, energy_config: &EnergyConfig)", returns: "HandleOrphanedAssemblies", doc: "Consumes one entry of the HandleOrphanedAssemblies hot potato." },
            { name: "verify_online", signature: "(turret: &Turret)", returns: "OnlineReceipt", doc: "Aborts unless the turret is online; otherwise returns a receipt for get_target_priority_list." },
            { name: "get_target_priority_list", signature: "(turret: &Turret, owner_character: &Character, target_candidate_list: vector<u8>, receipt: OnlineReceipt)", returns: "vector<u8>", doc: "Called by the game per targeting tick: applies default or extension-defined rules and returns which targets to shoot and at what priority." },
            { name: "destroy_online_receipt", signature: "<Auth: drop>(receipt: OnlineReceipt, _: Auth)", doc: "Extension: destroys an OnlineReceipt without using it for get_target_priority_list." },
            { name: "update_metadata_name", signature: "(turret: &mut Turret, owner_cap: &OwnerCap<Turret>, name: String)", doc: "Owner: updates the turret's display name." },
            { name: "update_metadata_description", signature: "(turret: &mut Turret, owner_cap: &OwnerCap<Turret>, description: String)", doc: "Owner: updates the turret's description." },
            { name: "update_metadata_url", signature: "(turret: &mut Turret, owner_cap: &OwnerCap<Turret>, url: String)", doc: "Owner: updates the turret's URL." },
            { name: "reveal_location", signature: "(turret: &Turret, registry: &mut LocationRegistry, admin_acl: &AdminACL, solarsystem: u64, x: String, y: String, z: String, ctx: &TxContext)", doc: "Admin ACL only: reveals plain-text coordinates for this turret." },
            { name: "anchor", signature: "(registry: &mut ObjectRegistry, network_node: &mut NetworkNode, character: &Character, admin_acl: &AdminACL, item_id: u64, type_id: u64, location_hash: vector<u8>, ctx: &mut TxContext)", returns: "Turret", doc: "Admin: creates a new Turret." },
            { name: "share_turret", signature: "(turret: Turret, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly anchored Turret object." },
            { name: "update_energy_source", signature: "(turret: &mut Turret, network_node: &mut NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: re-points the turret's energy source (must be offline)." },
            { name: "unanchor", signature: "(turret: Turret, network_node: &mut NetworkNode, energy_config: &EnergyConfig, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys a connected Turret." },
            { name: "unanchor_orphan", signature: "(turret: Turret, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys an orphaned Turret." },
        ],
    },
    {
        module: "world::character",
        doc: "Character creation and lifecycle, with an OwnerCap-based access model beyond simple wallet ownership.",
        catalog: "world",
        functions: [
            { name: "update_metadata_name", signature: "(character: &mut Character, owner_cap: &OwnerCap<Character>, name: String)", doc: "Owner: updates the character's display name." },
            { name: "update_metadata_description", signature: "(character: &mut Character, owner_cap: &OwnerCap<Character>, description: String)", doc: "Owner: updates the character's description." },
            { name: "update_metadata_url", signature: "(character: &mut Character, owner_cap: &OwnerCap<Character>, url: String)", doc: "Owner: updates the character's URL." },
            { name: "create_character", signature: "(registry: &mut ObjectRegistry, admin_acl: &AdminACL, game_character_id: u32, tenant: String, tribe_id: u32, character_address: address, name: String, ctx: &mut TxContext)", returns: "Character", doc: "Admin: creates a new Character, mints its OwnerCap, and issues a PlayerProfile to the wallet." },
            { name: "borrow_owner_cap", signature: "<T: key>(character: &mut Character, owner_cap_ticket: Receiving<OwnerCap<T>>, ctx: &TxContext)", returns: "(OwnerCap<T>, ReturnOwnerCapReceipt)", doc: "Character's wallet owner: borrows an OwnerCap sent to the character object (transfer-to-object pattern)." },
            { name: "return_owner_cap", signature: "<T: key>(character: &Character, owner_cap: OwnerCap<T>, receipt: access::ReturnOwnerCapReceipt)", doc: "Returns a borrowed OwnerCap back to the character object, consuming the receipt." },
            { name: "share_character", signature: "(character: Character, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly created Character object." },
            { name: "update_tribe", signature: "(character: &mut Character, admin_acl: &AdminACL, tribe_id: u32, ctx: &TxContext)", doc: "Admin: updates the character's tribe id." },
            { name: "update_address", signature: "(character: &mut Character, admin_acl: &AdminACL, character_address: address, ctx: &TxContext)", doc: "Admin: updates the character's wallet address. Existing PlayerProfile stays at the old address." },
            { name: "update_tenant_id", signature: "(character: &mut Character, admin_acl: &AdminACL, tenant: String, ctx: &TxContext)", doc: "Admin/emergency: updates the character's tenant, re-deriving its key." },
            { name: "delete_character", signature: "(character: Character, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: deletes a Character and its metadata." },
        ],
    },
    {
        module: "world::killmail",
        doc: "Immutable on-chain killmail records for PvP losses.",
        catalog: "world",
        functions: [
            { name: "create_killmail", signature: "(registry: &mut KillmailRegistry, admin_acl: &AdminACL, item_id: u64, killer_id: u64, victim_id: u64, reported_by_character: &Character, kill_timestamp: u64, loss_type: u8, solar_system_id: u64, ctx: &mut TxContext)", doc: "Admin: creates and shares a new Killmail as an on-chain record." },
        ],
    },
    {
        module: "world::network_node",
        doc: "Energy source for connected assemblies: fuel deposit/burn, energy production, assembly connect/disconnect.",
        catalog: "world",
        functions: [
            { name: "deposit_fuel", signature: "(nwn: &mut NetworkNode, admin_acl: &AdminACL, owner_cap: &OwnerCap<NetworkNode>, type_id: u64, volume: u64, quantity: u64, clock: &Clock, ctx: &mut TxContext)", doc: "Owner (sponsored): deposits fuel into the network node." },
            { name: "withdraw_fuel", signature: "(nwn: &mut NetworkNode, admin_acl: &AdminACL, owner_cap: &OwnerCap<NetworkNode>, type_id: u64, quantity: u64, ctx: &mut TxContext)", doc: "Owner (sponsored): withdraws fuel from the network node." },
            { name: "online", signature: "(nwn: &mut NetworkNode, owner_cap: &OwnerCap<NetworkNode>, clock: &Clock)", doc: "Owner: starts fuel burning and energy production." },
            { name: "offline", signature: "(nwn: &mut NetworkNode, fuel_config: &FuelConfig, owner_cap: &OwnerCap<NetworkNode>, clock: &Clock)", returns: "OfflineAssemblies", doc: "Owner: stops production/burning; returns a hot potato that must offline every connected assembly." },
            { name: "update_metadata_name", signature: "(nwn: &mut NetworkNode, owner_cap: &OwnerCap<NetworkNode>, name: String)", doc: "Owner: updates the network node's display name." },
            { name: "update_metadata_description", signature: "(nwn: &mut NetworkNode, owner_cap: &OwnerCap<NetworkNode>, description: String)", doc: "Owner: updates the network node's description." },
            { name: "update_metadata_url", signature: "(nwn: &mut NetworkNode, owner_cap: &OwnerCap<NetworkNode>, url: String)", doc: "Owner: updates the network node's URL." },
            { name: "anchor", signature: "(registry: &mut ObjectRegistry, character: &Character, admin_acl: &AdminACL, item_id: u64, type_id: u64, location_hash: vector<u8>, fuel_max_capacity: u64, fuel_burn_rate_in_ms: u64, max_energy_production: u64, ctx: &mut TxContext)", returns: "NetworkNode", doc: "Admin: creates a new NetworkNode." },
            { name: "share_network_node", signature: "(nwn: NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: shares a freshly anchored NetworkNode object." },
            { name: "connect_assemblies", signature: "(nwn: &mut NetworkNode, admin_acl: &AdminACL, assembly_ids: vector<ID>, ctx: &TxContext)", returns: "UpdateEnergySources", doc: "Admin: connects assemblies to this network node; returns a hot potato requiring each assembly's energy source be updated." },
            { name: "unanchor", signature: "(nwn: &mut NetworkNode, admin_acl: &AdminACL, ctx: &TxContext)", returns: "HandleOrphanedAssemblies", doc: "Admin: stops production and returns a hot potato requiring every connected assembly be handled before destroy_network_node." },
            { name: "destroy_network_node", signature: "(nwn: NetworkNode, orphaned_assemblies: HandleOrphanedAssemblies, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Admin: destroys the network node after all connected assemblies have been processed." },
            { name: "update_fuel", signature: "(nwn: &mut NetworkNode, fuel_config: &FuelConfig, admin_acl: &AdminACL, clock: &Clock, ctx: &TxContext)", returns: "OfflineAssemblies", doc: "Admin: advances fuel consumption; returns a (possibly empty) hot potato if fuel depletion forces the node offline." },
            { name: "destroy_offline_assemblies", signature: "(offline_assemblies: OfflineAssemblies)", doc: "Destroys the OfflineAssemblies hot potato once every listed assembly has been brought offline." },
            { name: "destroy_update_energy_sources", signature: "(update_energy_sources: UpdateEnergySources)", doc: "Destroys the UpdateEnergySources hot potato once every listed assembly's source has been updated." },
            { name: "destroy_orphaned_assemblies", signature: "(orphaned_assemblies: HandleOrphanedAssemblies)", doc: "Destroys the HandleOrphanedAssemblies hot potato once every listed assembly has been handled." },
        ],
    },
    {
        module: "world::energy",
        doc: "Per-assembly-type energy requirements and per-network-node energy reservation accounting.",
        catalog: "world",
        functions: [
            { name: "set_energy_config", signature: "(energy_config: &mut EnergyConfig, admin_acl: &AdminACL, assembly_type_id: u64, energy_required: u64, ctx: &TxContext)", doc: "Admin: sets or updates the energy requirement for an assembly type." },
            { name: "remove_energy_config", signature: "(energy_config: &mut EnergyConfig, admin_acl: &AdminACL, assembly_type_id: u64, ctx: &TxContext)", doc: "Admin: removes the energy requirement configured for an assembly type." },
        ],
    },
    {
        module: "world::fuel",
        doc: "Per-fuel-type efficiency configuration used to compute burn rates.",
        catalog: "world",
        functions: [
            { name: "set_fuel_efficiency", signature: "(fuel_config: &mut FuelConfig, admin_acl: &AdminACL, fuel_type_id: u64, fuel_efficiency: u64, ctx: &TxContext)", doc: "Admin: sets or updates the efficiency percentage (10-100) for a fuel type." },
            { name: "unset_fuel_efficiency", signature: "(fuel_config: &mut FuelConfig, admin_acl: &AdminACL, fuel_type_id: u64, ctx: &TxContext)", doc: "Admin: removes the efficiency configuration for a fuel type." },
        ],
    },
    {
        module: "world::location",
        doc: "Location hash storage and server-signed proximity/distance proof verification.",
        catalog: "world",
        functions: [
            { name: "verify_proximity", signature: "(location: &Location, proof: LocationProof, server_registry: &ServerAddressRegistry, clock: &Clock, ctx: &mut TxContext)", doc: "Verifies a server-signed LocationProof struct proves the sender is near the given location. Aborts on failure." },
            { name: "verify_proximity_proof_from_bytes", signature: "(server_registry: &ServerAddressRegistry, location: &Location, proof_bytes: vector<u8>, clock: &Clock, ctx: &mut TxContext)", doc: "Same as verify_proximity but takes a BCS-encoded proof." },
            { name: "verify_distance", signature: "(location: &Location, server_registry: &ServerAddressRegistry, proof_bytes: vector<u8>, max_distance: u64, ctx: &mut TxContext)", doc: "Verifies a server-signed proof that two structures are within max_distance." },
            { name: "verify_same_location", signature: "(location_a_hash: vector<u8>, location_b_hash: vector<u8>)", doc: "Asserts two location hashes are equal (used for ephemeral same-location checks)." },
            { name: "update", signature: "(location: &mut Location, admin_acl: &AdminACL, location_hash: vector<u8>, ctx: &TxContext)", doc: "Admin: overwrites a structure's stored location hash." },
        ],
    },
    {
        module: "world::rift",
        doc: "Server-controlled spatial objects (Rifts) with hashed location, optionally broadcast in plain text.",
        catalog: "world",
        functions: [
            { name: "spawn", signature: "(registry: &mut ObjectRegistry, admin_acl: &AdminACL, item_id: u64, tenant: String, location_hash: vector<u8>, ctx: &mut TxContext)", returns: "Rift", doc: "Sponsor: creates a new Rift at a hashed location." },
            { name: "share_rift", signature: "(rift: Rift, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Sponsor: shares a freshly spawned Rift object." },
            { name: "broadcast_location", signature: "(rift: &Rift, location_registry: &mut LocationRegistry, admin_acl: &AdminACL, solarsystem: u64, x: String, y: String, z: String, ctx: &TxContext)", doc: "Sponsor: reveals the rift's plain-text coordinates in the LocationRegistry." },
            { name: "despawn", signature: "(rift: Rift, admin_acl: &AdminACL, ctx: &TxContext)", doc: "Sponsor: destroys a Rift." },
        ],
    },

    // ================= Silver Link =================
    {
        module: "silver_gate::silver_gate",
        doc: "Gate access-control extension: Private/Public/Tribe modes plus whitelist, gating jump permit issuance.",
        catalog: "silverlink",
        functions: [
            { name: "authorize", signature: "(gate: &mut Gate, owner_character: &Character, owner_cap: &OwnerCap<Gate>, permit_duration_ms: u64, ctx: &mut TxContext)", returns: "ID", doc: "Enables this extension on a gate and creates its SilverGateConfig, defaulting to Private mode." },
            { name: "set_access_mode", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, mode: u8, ctx: &mut TxContext)", doc: "Owner: sets access mode (0=Private, 1=Public, 2=Tribe)." },
            { name: "set_permit_duration", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, permit_duration_ms: u64)", doc: "Owner: updates how long newly issued jump permits remain valid." },
            { name: "add_whitelisted_tribes", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Owner: adds tribe ids that bypass the access mode entirely." },
            { name: "remove_whitelisted_tribes", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Owner: removes tribe ids from the whitelist." },
            { name: "add_whitelisted_characters", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Owner: adds character ids that bypass the access mode entirely." },
            { name: "remove_whitelisted_characters", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Owner: removes character ids from the whitelist." },
            { name: "set_whitelist", signature: "(gate: &Gate, config: &mut SilverGateConfig, owner_cap: &OwnerCap<Gate>, tribe_ids: vector<u32>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Owner: replaces the entire whitelist (tribes + characters) in one call." },
            { name: "issue_jump_permit", signature: "(source_gate: &Gate, destination_gate: &Gate, config: &SilverGateConfig, character: &Character, clock: &Clock, ctx: &mut TxContext)", returns: "ID", doc: "Anyone: mints a JumpPermit to a character that currently has access per the gate's mode/whitelist. Step 1 of a 2-tx flow (jump_with_permit is step 2)." },
            { name: "delete_jump_permit", signature: "(source_gate: &Gate, jump_permit: JumpPermit)", doc: "Owner of the permit: voids a JumpPermit via this extension." },
        ],
    },
    {
        module: "silver_ssu::shared",
        doc: "Storage Unit access-control extension: Private/Public/Tribe modes plus whitelist, gating take/put on shared storage.",
        catalog: "silverlink",
        functions: [
            { name: "authorize", signature: "(storage_unit: &mut StorageUnit, owner_cap: &OwnerCap<StorageUnit>, owner_character: &Character, ctx: &mut TxContext)", doc: "Enables this extension on a storage unit and creates its SilverSSUConfig, defaulting to Private mode." },
            { name: "set_access_mode", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, mode: u8, ctx: &mut TxContext)", doc: "Sets access mode (0=Private, 1=Public, 2=Tribe)." },
            { name: "add_whitelisted_tribes", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Adds tribe ids that bypass the access mode entirely." },
            { name: "remove_whitelisted_tribes", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Removes tribe ids from the whitelist." },
            { name: "add_whitelisted_characters", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Adds character ids that bypass the access mode entirely." },
            { name: "remove_whitelisted_characters", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Removes character ids from the whitelist." },
            { name: "set_whitelist", signature: "(storage_unit: &StorageUnit, config: &mut SilverSSUConfig, _owner_cap: &OwnerCap<StorageUnit>, tribe_ids: vector<u32>, character_ids: vector<ID>, ctx: &mut TxContext)", doc: "Replaces the entire whitelist (tribes + characters) in one call." },
            { name: "take", signature: "(storage_unit: &mut StorageUnit, config: &SilverSSUConfig, character: &Character, type_id: u64, quantity: u32, ctx: &mut TxContext)", doc: "Character (must be tx sender, must have access): withdraws items from shared storage into their owned inventory." },
            { name: "take_many", signature: "(storage_unit: &mut StorageUnit, config: &SilverSSUConfig, character: &Character, type_ids: vector<u64>, quantities: vector<u32>, ctx: &mut TxContext)", doc: "Batch version of take() for multiple type_ids/quantities in one call." },
            { name: "put", signature: "(storage_unit: &mut StorageUnit, character: &Character, owner_cap: &OwnerCap<Character>, type_id: u64, quantity: u32, ctx: &mut TxContext)", doc: "Deposits items from the character's owned inventory into shared storage." },
            { name: "put_many", signature: "(storage_unit: &mut StorageUnit, character: &Character, owner_cap: &OwnerCap<Character>, type_ids: vector<u64>, quantities: vector<u32>, ctx: &mut TxContext)", doc: "Batch version of put() for multiple type_ids/quantities in one call." },
        ],
    },
    {
        module: "silver_location::silver_location",
        doc: "On-chain encrypted location + per-assembly allowlist (Seal identity-based encryption) — generic over the assembly type T (any type with a world::access::OwnerCap<T>; the app only ever instantiates <NetworkNode>). Owner is always permanently allowed to decrypt, independent of the allowlist. Sharing is address-based (list) OR tribe-based (whitelisted_tribe_ids) — no separate Private/Public/Tribe mode.",
        catalog: "silverlink",
        functions: [
            { name: "create", signature: "<T: key>(assembly: &T, owner_cap: &OwnerCap<T>, owner_address: address, ciphertext: vector<u8>, initial_members: vector<address>, initial_whitelisted_tribe_ids: vector<u32>, ctx: &mut TxContext)", returns: "ID", doc: "Owner: creates the allowlist for an assembly, with its encrypted location and initial sharing (addresses + tribe ids) set in the same call." },
            { name: "set_location", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, ciphertext: vector<u8>, ctx: &mut TxContext)", doc: "Owner: updates the stored encrypted location. An empty ciphertext deletes the stored location without touching sharing." },
            { name: "add_members", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, members: vector<address>, ctx: &mut TxContext)", doc: "Owner: adds one or more addresses to the allowlist." },
            { name: "remove_members", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, members: vector<address>, ctx: &mut TxContext)", doc: "Owner: removes one or more addresses from the allowlist." },
            { name: "set_members", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, members: vector<address>, ctx: &mut TxContext)", doc: "Owner: replaces the address list only, leaving whitelisted_tribe_ids untouched." },
            { name: "add_whitelisted_tribes", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Owner: adds one or more tribe ids to the whitelist." },
            { name: "remove_whitelisted_tribes", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Owner: removes one or more tribe ids from the whitelist." },
            { name: "set_whitelist", signature: "<T: key>(assembly: &T, allowlist: &mut LocationAllowlist<T>, owner_cap: &OwnerCap<T>, members: vector<address>, tribe_ids: vector<u32>, ctx: &mut TxContext)", doc: "Owner: replaces both the address list and tribe whitelist in one call (full desired state)." },
            { name: "seal_approve", signature: "<T>(id: vector<u8>, allowlist: &LocationAllowlist<T>, ctx: &TxContext)", doc: "Seal key servers dry-run this to check decrypt access via owner or direct address membership only (no tribe check). Aborts on failure." },
            { name: "seal_approve_tribe", signature: "<T>(id: vector<u8>, allowlist: &LocationAllowlist<T>, character: &Character, ctx: &TxContext)", doc: "Same as seal_approve, but also grants access via tribe membership — verifies character is owned by the caller before checking its tribe against the whitelist." },
        ],
    },
];
