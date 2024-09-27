use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Invalid CW20 hook")]
    InvalidCw20Hook {},

    #[error("No funds sent")]
    NoFunds {},

    #[error("Insufficient funds")]
    InsufficientFunds {},

    #[error("Exceeds collateral ratio")]
    ExceedsCollateralRatio {},

    #[error("Excess repayment")]
    ExcessRepayment {},
}