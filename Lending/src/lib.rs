use cosmwasm_std::{
    entry_point, from_json, to_binary, to_json_binary, Addr, Binary, Decimal, Deps, DepsMut, Env,
    MessageInfo, Response, StdError, StdResult, Uint128, WasmMsg,
};
use cw20::{Cw20ExecuteMsg, Cw20ReceiveMsg};

mod error;
mod msg;
mod state;

use crate::error::ContractError;
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ReceiveMsg, TotalOwedResponse};
use crate::state::{Config, PoolInfo, UserInfo, CONFIG, POOL, USERS};

impl UserInfo {
    pub fn calculate_interest_portion(
        &self,
        repay_amount: Uint128,
    ) -> StdResult<(Uint128, Uint128)> {
        let total_owed = self.borrowed_amount + self.interest_amount;
        if total_owed.is_zero() {
            return Ok((Uint128::zero(), Uint128::zero()));
        }

        let interest_ratio = Decimal::from_ratio(self.interest_amount, total_owed);
        let interest_portion = repay_amount * interest_ratio;
        let principal_portion = repay_amount.checked_sub(interest_portion)?;

        Ok((interest_portion, principal_portion))
    }
}

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
        total_interest: Uint128::zero(),
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
        ExecuteMsg::UpdateInterest { user } => execute::update_interest(deps, env, user),
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
            if info.sender != config.usd_token {
                return Err(ContractError::InvalidToken {});
            }
            execute::stake(deps, env, cw20_msg.sender, cw20_msg.amount)
        }
        ReceiveMsg::Repay {} => {
            if info.sender != config.om_token {
                return Err(ContractError::InvalidToken {});
            }
            execute::repay(deps, env, cw20_msg.sender, cw20_msg.amount)
        }
    }
}

pub mod execute {
    use super::*;

    pub fn stake(
        deps: DepsMut,
        _env: Env,
        sender: String,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let sender_addr = deps.api.addr_validate(&sender)?;
        let mut pool = POOL.load(deps.storage)?;

        let mut user = USERS
            .may_load(deps.storage, &sender_addr)?
            .unwrap_or_default();
        user.staked_amount += amount;
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
        env: Env,
        info: MessageInfo,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &info.sender)?;

        update_user_interest(deps.storage, &env, &config, &info.sender, &mut user)?;

        if user.staked_amount < amount {
            return Err(ContractError::InsufficientFunds {});
        }

        if user.borrowed_amount > Uint128::zero() {
            let remaining_stake = user.staked_amount.checked_sub(amount)?;
            let total_owed = user.borrowed_amount + user.interest_amount;
            let min_required_stake = total_owed
                .checked_mul(Uint128::from(100u128))?
                .checked_div(config.collateral_ratio)?;

            if remaining_stake < min_required_stake {
                return Err(ContractError::ExceedsCollateralRatio {});
            }
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

        update_user_interest(deps.storage, &env, &config, &info.sender, &mut user)?;

        let total_owed = user.borrowed_amount + user.interest_amount;
        let max_borrow = user
            .staked_amount
            .checked_mul(config.collateral_ratio)?
            .checked_div(Uint128::from(100u128))?
            .checked_sub(total_owed)?;

        if amount > max_borrow {
            return Err(ContractError::ExceedsCollateralRatio {});
        }

        user.borrowed_amount += amount;
        user.last_interest_update = env.block.time.seconds();
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
            .add_attribute("amount", amount))
    }

    pub fn repay(
        deps: DepsMut,
        env: Env,
        sender: String,
        amount: Uint128,
    ) -> Result<Response, ContractError> {
        let sender_addr = deps.api.addr_validate(&sender)?;
        let config = CONFIG.load(deps.storage)?;
        let mut pool = POOL.load(deps.storage)?;
        let mut user = USERS.load(deps.storage, &sender_addr)?;

        // Handle zero interest case
        if user.interest_amount.is_zero() {
            if amount > user.borrowed_amount {
                return Err(ContractError::ExcessRepayment {});
            }

            user.borrowed_amount = user.borrowed_amount.checked_sub(amount)?;
            pool.total_borrowed = pool.total_borrowed.checked_sub(amount)?;

            USERS.save(deps.storage, &sender_addr, &user)?;
            POOL.save(deps.storage, &pool)?;

            return Ok(Response::new()
                .add_attribute("action", "repay")
                .add_attribute("amount", amount)
                .add_attribute("principal_paid", amount)
                .add_attribute("interest_paid", "0")
                .add_attribute("remaining_borrowed", user.borrowed_amount)
                .add_attribute("sender", sender));
        }

        // Normal repayment flow with interest
        let total_owed = user.borrowed_amount + user.interest_amount;
        if amount > total_owed {
            return Err(ContractError::ExcessRepayment {});
        }

        let (interest_portion, principal_portion) = user.calculate_interest_portion(amount)?;

        user.interest_amount = user.interest_amount.checked_sub(interest_portion)?;
        user.borrowed_amount = user.borrowed_amount.checked_sub(principal_portion)?;
        user.last_interest_update = env.block.time.seconds();

        pool.total_borrowed = pool.total_borrowed.checked_sub(principal_portion)?;
        pool.total_interest = pool.total_interest.checked_sub(interest_portion)?;

        USERS.save(deps.storage, &sender_addr, &user)?;
        POOL.save(deps.storage, &pool)?;

        Ok(Response::new()
            .add_attribute("action", "repay")
            .add_attribute("total_amount", amount)
            .add_attribute("interest_paid", interest_portion)
            .add_attribute("principal_paid", principal_portion)
            .add_attribute("remaining_borrowed", user.borrowed_amount)
            .add_attribute("remaining_interest", user.interest_amount)
            .add_attribute("sender", sender))
    }

    pub fn update_interest(
        deps: DepsMut,
        env: Env,
        user: String,
    ) -> Result<Response, ContractError> {
        let config = CONFIG.load(deps.storage)?;
        let user_addr = deps.api.addr_validate(&user)?;
        let mut user_info = USERS.load(deps.storage, &user_addr)?;

        update_user_interest(deps.storage, &env, &config, &user_addr, &mut user_info)?;

        Ok(Response::new()
            .add_attribute("action", "update_interest")
            .add_attribute("user", user))
    }

    fn update_user_interest(
        storage: &mut dyn cosmwasm_std::Storage,
        env: &Env,
        config: &Config,
        user_addr: &Addr,
        user: &mut UserInfo,
    ) -> Result<(), ContractError> {
        let time_elapsed = env.block.time.seconds() - user.last_interest_update;
        if time_elapsed > 0 && !user.borrowed_amount.is_zero() {
            let interest_rate = Decimal::from_ratio(config.interest_rate, Uint128::new(100));
            let annual_seconds = 31_536_000u64;

            let interest_multiplier = Decimal::from_ratio(time_elapsed, annual_seconds);
            let new_interest = user.borrowed_amount * interest_rate * interest_multiplier;

            user.interest_amount += new_interest;
            user.last_interest_update = env.block.time.seconds();

            let mut pool = POOL.load(storage)?;
            pool.total_interest += new_interest;
            POOL.save(storage, &pool)?;
        }
        Ok(())
    }
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetConfig {} => to_json_binary(&query::config(deps)?),
        QueryMsg::GetUserInfo { address } => to_json_binary(&query::user_info(deps, address)?),
        QueryMsg::GetPoolInfo {} => to_json_binary(&query::pool_info(deps)?),
        QueryMsg::GetTotalOwed { address } => {
            to_json_binary(&query::total_owed(deps, env, address)?)
        }
    }
}

pub mod query {
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

    pub fn total_owed(deps: Deps, env: Env, address: Addr) -> StdResult<TotalOwedResponse> {
        let config = CONFIG.load(deps.storage)?;
        let user = USERS.load(deps.storage, &address)?;

        let time_elapsed = env.block.time.seconds() - user.last_interest_update;
        let current_interest = if time_elapsed > 0 && !user.borrowed_amount.is_zero() {
            let interest_rate = Decimal::from_ratio(config.interest_rate, Uint128::new(100));
            let annual_seconds = 31_536_000u64;
            let interest_multiplier = Decimal::from_ratio(time_elapsed, annual_seconds);
            user.interest_amount + (user.borrowed_amount * interest_rate * interest_multiplier)
        } else {
            user.interest_amount
        };

        Ok(TotalOwedResponse {
            borrowed_amount: user.borrowed_amount,
            interest_amount: current_interest,
            total_owed: user.borrowed_amount + current_interest,
        })
    }
}
