use cosmwasm_std::{
    entry_point, from_json, to_binary, to_json_binary, Addr, Binary, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Uint128, WasmMsg,
};
use cw20::{Cw20ExecuteMsg, Cw20ReceiveMsg};

mod error;
mod msg;
mod state;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ReceiveMsg};
use crate::state::{Config, PoolInfo, UserInfo, CONFIG, POOL, USERS};

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

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("usd_token", msg.usd_token)
        .add_attribute("om_token", msg.om_token))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Receive(msg) => receive_cw20(deps, env, info, msg),
        ExecuteMsg::Borrow { amount } => execute::borrow(deps, env, info, amount),
        ExecuteMsg::Unstake { amount } => execute::unstake(deps, env, info, amount),
    }
}

pub fn receive_cw20(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    cw20_msg: Cw20ReceiveMsg,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    match from_json(&cw20_msg.msg)? {
        ReceiveMsg::Stake {} => {
            // Verify USD token
            if info.sender != config.usd_token {
                return Err(ContractError::InvalidToken {});
            }
            execute::stake(deps, env, cw20_msg.sender, cw20_msg.amount)
        }
        ReceiveMsg::Repay {} => {
            // Verify OM token
            if info.sender != config.om_token {
                return Err(ContractError::InvalidToken {});
            }
            execute::repay(deps, env, cw20_msg.sender, cw20_msg.amount)
        }
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

    pub fn stake(
        deps: DepsMut,
        env: Env,
        sender: String,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let sender_addr = deps.api.addr_validate(&sender)?;
        let mut pool = POOL.load(deps.storage)?;

        let mut user = USERS
            .may_load(deps.storage, &sender_addr)?
            .unwrap_or_default();
        user.staked_amount += amount;
        user.last_interaction = env.block.time.seconds();
        USERS.save(deps.storage, &sender_addr, &user)?;

        pool.total_staked += amount;
        POOL.save(deps.storage, &pool)?;

        Ok(Response::new()
            .add_attribute("action", "stake")
            .add_attribute("amount", amount)
            .add_attribute("sender", sender))
    }

    pub fn unstake(
        deps: DepsMut,
        _env: Env,
        info: MessageInfo,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        if user.staked_amount < amount {
            return Err(ContractError::InsufficientFunds {});
        }

        // Check if unstaking would break collateral ratio
        if user.borrowed_amount > Uint128::zero() {
            let remaining_stake = user.staked_amount.checked_sub(amount)?;
            let min_required_stake = user
                .borrowed_amount
                .checked_mul(Uint128::from(100u128))?
                .checked_div(config.collateral_ratio)?;

            if remaining_stake < min_required_stake {
                return Err(ContractError::ExceedsCollateralRatio {});
            }
        }

        user.staked_amount -= amount;
        user.last_interaction = _env.block.time.seconds();
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_staked -= amount;
        POOL.save(deps.storage, &pool)?;

        // Transfer USD tokens back to user
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
            .add_attribute("amount", amount))
    }

    pub fn borrow(
        deps: DepsMut,
        env: Env,
        info: MessageInfo,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        let max_borrow = user
            .staked_amount
            .checked_mul(config.collateral_ratio)?
            .checked_div(Uint128::from(100u128))?;

        if user.borrowed_amount.checked_add(amount)? > max_borrow {
            return Err(ContractError::ExceedsCollateralRatio {});
        }

        user.borrowed_amount += amount;
        user.last_interaction = env.block.time.seconds();
        USERS.save(deps.storage, &info.sender, &user)?;

        pool.total_borrowed += amount;
        POOL.save(deps.storage, &pool)?;

        // Transfer OM tokens to borrower
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
            .add_attribute("amount", amount))
    }

    pub fn repay(
        deps: DepsMut,
        env: Env,
        sender: String,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let sender_addr = deps.api.addr_validate(&sender)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &sender_addr)?;

        if amount > user.borrowed_amount {
            return Err(ContractError::ExcessRepayment {});
        }

        user.borrowed_amount -= amount;
        user.last_interaction = env.block.time.seconds();
        USERS.save(deps.storage, &sender_addr, &user)?;

        pool.total_borrowed -= amount;
        POOL.save(deps.storage, &pool)?;

        Ok(Response::new()
            .add_attribute("action", "repay")
            .add_attribute("amount", amount)
            .add_attribute("sender", sender))
    }
}

mod query {
    use super::*;

    pub fn config(deps: Deps) -> StdResult<Config> {
        CONFIG.load(deps.storage)
    }

    pub fn user_info(deps: Deps, address: Addr) -> StdResult<UserInfo> {
        USERS
            .may_load(deps.storage, &address)?
            .ok_or_else(|| StdError::not_found("UserInfo"))
    }

    pub fn pool_info(deps: Deps) -> StdResult<PoolInfo> {
        POOL.load(deps.storage)
    }
}
