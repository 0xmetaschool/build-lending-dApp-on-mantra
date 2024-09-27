#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_binary, CosmosMsg, WasmMsg, SubMsg, Addr, Uint128};
    use cw20::{Cw20ReceiveMsg, Cw20ExecuteMsg};
    use cw20_base::msg::ExecuteMsg as Cw20BaseMsg;
    use cw20_base::contract::execute;
    use crate::state::{Config, StakerInfo, BorrowerInfo, CONFIG, STAKERS, BORROWERS};
    use crate::execute::{stake, borrow, repay};

    fn init_config() -> Config {
        Config {
            usd_token: Addr::unchecked("usd_token"),
            om_token: Addr::unchecked("om_token"),
            collateral_ratio: 100u64, // 100%
            interest_rate: 10u64, //10%
        }
    }

    #[test]
    fn test_stake() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("staker", &coins(100, "USD"));

        println!("Initializing config...");
        CONFIG.save(deps.as_mut().storage, &init_config()).unwrap();
        println!("Config initialized successfully");

        println!("Executing stake...");
        let res = stake(deps.as_mut(), env.clone(), info.clone()).unwrap();
        println!("Stake executed successfully");

        println!("Checking response messages...");
        assert_eq!(res.messages.len(), 1);
        if let CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr,
            msg,
            funds: _,
        }) = &res.messages[0].msg
        {
            assert_eq!(contract_addr, "om_token");
            let transfer_msg: Cw20BaseMsg = from_binary(msg).unwrap();
            assert_eq!(
                transfer_msg,
                Cw20BaseMsg::Transfer {
                    recipient: env.contract.address.to_string(),
                    amount: Uint128::from(100u128),
                }
            );
            println!("Transfer message verified: {:?}", transfer_msg);
        } else {
            panic!("Unexpected message type");
        }

        println!("Checking staker info in storage...");
        let staker_info = STAKERS.load(deps.as_ref().storage, Addr::unchecked("staker")).unwrap();
        assert_eq!(
            staker_info,
            StakerInfo {
                staked_amount: Uint128::from(100u128),
                last_update_time: env.block.time.seconds(),
            }
        );
        println!("Staker info verified: {:?}", staker_info);
    }

    #[test]
    fn test_borrow() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("borrower", &[]);

        println!("Initializing config...");
        CONFIG.save(deps.as_mut().storage, &init_config()).unwrap();
        println!("Config initialized successfully");

        println!("Initializing staker info...");
        STAKERS.save(
            deps.as_mut().storage,
            Addr::unchecked("borrower"),
            &StakerInfo {
                staked_amount: Uint128::from(1000u128),
                last_update_time: env.block.time.seconds(),
            },
        )
        .unwrap();
        println!("Staker info initialized successfully");

        println!("Executing borrow...");
        let res = borrow(deps.as_mut(), env.clone(), info.clone()).unwrap();
        println!("Borrow executed successfully");

        println!("Checking response messages...");
        assert_eq!(res.messages.len(), 1);
        if let CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr,
            msg,
            funds: _,
        }) = &res.messages[0].msg
        {
            assert_eq!(contract_addr, "om_token");
            let transfer_msg: Cw20BaseMsg = from_binary(msg).unwrap();
            assert_eq!(
                transfer_msg,
                Cw20BaseMsg::Transfer {
                    recipient: "borrower".to_string(),
                    amount: Uint128::from(10u128),
                }
            );
            println!("Transfer message verified: {:?}", transfer_msg);
        } else {
            panic!("Unexpected message type");
        }

        println!("Checking borrower info in storage...");
        let borrower_info = BORROWERS
            .load(deps.as_ref().storage, Addr::unchecked("borrower"))
            .unwrap();
        assert_eq!(
            borrower_info,
            BorrowerInfo {
                borrowed_amount: Uint128::from(10u128),
                collateral_amount: Uint128::from(1000u128),
                last_update_time: env.block.time.seconds(),
            }
        );
        println!("Borrower info verified: {:?}", borrower_info);
    }

    #[test]
    fn test_repay() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        let info = mock_info("repayer", &coins(500, "uom"));

        println!("Initializing config...");
        CONFIG.save(deps.as_mut().storage, &init_config()).unwrap();
        println!("Config initialized successfully");

        println!("Initializing borrower info...");
        BORROWERS.save(
            deps.as_mut().storage,
            Addr::unchecked("repayer"),
            &BorrowerInfo {
                borrowed_amount: Uint128::from(1000u128),
                collateral_amount: Uint128::from(1000u128),
                last_update_time: env.block.time.seconds(),
            },
        )
        .unwrap();
        println!("Borrower info initialized successfully");

        println!("Executing repay...");
        let res = repay(deps.as_mut(), env.clone(), info.clone()).unwrap();
        println!("Repay executed successfully");

        println!("Checking response messages...");
        assert_eq!(res.messages.len(), 1);
        if let CosmosMsg::Wasm(WasmMsg::Execute {
            contract_addr,
            msg,
            funds: _,
        }) = &res.messages[0].msg
        {
            assert_eq!(contract_addr, "om_token");
            let transfer_msg: Cw20BaseMsg = from_binary(&msg).unwrap();
            assert_eq!(
                transfer_msg,
                Cw20BaseMsg::Transfer {
                    recipient: env.contract.address.to_string(),
                    amount: Uint128::from(500u128),
                }
            );
            println!("Transfer message verified: {:?}", transfer_msg);
        } else {
            panic!("Unexpected message type");
        }

        println!("Checking updated borrower info in storage...");
        let borrower_info = BORROWERS
            .load(deps.as_ref().storage, Addr::unchecked("repayer"))
            .unwrap();
        assert_eq!(
            borrower_info,
            BorrowerInfo {
                borrowed_amount: Uint128::from(500u128),
                collateral_amount: Uint128::from(1000u128),
                last_update_time: env.block.time.seconds(),
            }
        );
        println!("Updated borrower info verified: {:?}", borrower_info);
    }
}