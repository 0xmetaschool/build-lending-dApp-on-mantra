use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use cosmwasm_std::{Addr, Uint128};
use cw_storage_plus::{Item, Map};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Config {
    pub owner: Addr,
    pub usd_token: Addr,
    pub om_token: Addr,
    pub collateral_ratio: Uint128,
    pub interest_rate: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema, Default)]
pub struct UserInfo {
    pub staked_amount: Uint128,
    pub borrowed_amount: Uint128,
    pub last_interaction: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct PoolInfo {
    pub total_staked: Uint128,
    pub total_borrowed: Uint128,
}

pub const CONFIG: Item<Config> = Item::new("config");
pub const USERS: Map<&Addr, UserInfo> = Map::new("users");
pub const POOL: Item<PoolInfo> = Item::new("pool");