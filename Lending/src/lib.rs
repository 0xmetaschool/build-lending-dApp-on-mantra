use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    Uint128, WasmMsg, Addr, from_json, StdError, to_binary,
};
use cw20::{Cw20ExecuteMsg, Cw20ReceiveMsg};

mod error;
mod msg;
mod state;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::{Config, UserInfo, PoolInfo, CONFIG, USERS, POOL};

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    let config = Config {
        owner: info.sender.clone(),
        usd_token: deps.api.addr_validate(&msg.usd_token)?,
        om_token: deps.api.addr_validate(&msg.om_token)?,
        collateral_ratio: msg.collateral_ratio,
        interest_rate: msg.interest_rate,
    };
    CONFIG.save(deps.storage, &config)?;

    let pool = PoolInfo {
        total_staked: Uint128::zero(),
        total_borrowed: Uint128::zero(),
    };
    POOL.save(deps.storage, &pool)?;

    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Stake {} => execute::stake(deps, env, info),
        ExecuteMsg::Unstake { amount } => execute::unstake(deps, env, info, amount),
        ExecuteMsg::Borrow { amount } => execute::borrow(deps, env, info, amount),
        ExecuteMsg::Repay {} => execute::repay(deps, env, info),
        ExecuteMsg::Receive(msg) => receive_cw20(deps, env, info, msg),
    }
}

pub fn receive_cw20(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    cw20_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    match from_json(&cw20_msg.msg) {
        Ok(ExecuteMsg::Stake {}) => execute::stake(deps, env, info),
        Ok(ExecuteMsg::Repay {}) => execute::repay(deps, env, info),
        _ => Err(ContractError::InvalidCw20Hook {}),
    }
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetConfig {} => to_json_binary(&query::config(deps)?),
        QueryMsg::GetUserInfo { address } => to_json_binary(&query::user_info(deps, address)?),
        QueryMsg::GetPoolInfo {} => to_json_binary(&query::pool_info(deps)?),
    }
}

mod execute {
    use super::*;

    pub fn stake(deps: DepsMut, env: Env, info: MessageInfo) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let amount = info.funds.iter().find(|c| c.denom == config.usd_token.to_string())
            .map(|c| c.amount)
            .ok_or(ContractError::NoFunds {})?;

        let mut user = USERS.may_load(deps.storage, &info.sender)?.unwrap_or_default();
        user.staked_amount += amount;
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_staked += amount;
        POOL.save(deps.storage, &pool)?;

        Ok(Response::new().add_attribute("action", "stake"))
    }

    pub fn unstake(deps: DepsMut, _env: Env, info: MessageInfo, amount: Uint128) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        if user.staked_amount < amount {
            return Err(ContractError::InsufficientFunds {});
        }

        user.staked_amount -= amount;
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_staked -= amount;
        POOL.save(deps.storage, &pool)?;

        let msg = WasmMsg::Execute {
            contract_addr: config.usd_token.to_string(),
            msg: to_binary(&Cw20ExecuteMsg::Transfer {
                recipient: info.sender.to_string(),
                amount,
            })?,
            funds: vec![],
        };

        Ok(Response::new()
            .add_message(msg)
            .add_attribute("action", "unstake")
            .add_attribute("amount", amount.to_string()))
    }

    pub fn borrow(deps: DepsMut, _env: Env, info: MessageInfo, amount: Uint128) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        let max_borrow = user.staked_amount.multiply_ratio(config.collateral_ratio, 100u128);
        if user.borrowed_amount + amount > max_borrow {
            return Err(ContractError::ExceedsCollateralRatio {});
        }

        user.borrowed_amount += amount;
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_borrowed += amount;
        POOL.save(deps.storage, &pool)?;

        let msg = WasmMsg::Execute {
            contract_addr: config.om_token.to_string(),
            msg: to_binary(&Cw20ExecuteMsg::Transfer {
                recipient: info.sender.to_string(),
                amount,
            })?,
            funds: vec![],
        };

        Ok(Response::new()
            .add_message(msg)
            .add_attribute("action", "borrow")
            .add_attribute("amount", amount.to_string()))
    }

    pub fn repay(deps: DepsMut, _env: Env, info: MessageInfo) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        let repay_amount = info.funds.iter().find(|c| c.denom == config.om_token.to_string())
            .map(|c| c.amount)
            .ok_or(ContractError::NoFunds {})?;

        if repay_amount > user.borrowed_amount {
            return Err(ContractError::ExcessRepayment {});
        }

        user.borrowed_amount -= repay_amount;
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_borrowed -= repay_amount;
        POOL.save(deps.storage, &pool)?;

        Ok(Response::new()
            .add_attribute("action", "repay")
            .add_attribute("amount", repay_amount.to_string()))
    }
}

mod query {
    use super::*;

    pub fn config(deps: Deps) -> StdResult<Config> {
        CONFIG.load(deps.storage)
    }

    pub fn user_info(deps: Deps, address: Addr) -> StdResult<UserInfo> {
        USERS.may_load(deps.storage, &address)?.ok_or_else(|| StdError::not_found("UserInfo"))
    }

    pub fn pool_info(deps: Deps) -> StdResult<PoolInfo> {
        POOL.load(deps.storage)
    }
}