use cosmwasm_std::{DivideByZeroError, OverflowError, StdError};
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

    #[error("Invalid token")]
    InvalidToken {},
}

impl From<OverflowError> for ContractError {
    fn from(err: OverflowError) -> Self {
        ContractError::Std(StdError::generic_err(format!("Overflow error: {}", err)))
    }
}

impl From<DivideByZeroError> for ContractError {
    fn from(err: DivideByZeroError) -> Self {
        ContractError::Std(StdError::generic_err(format!(
            "Divide by zero error: {}",
            err
        )))
    }
}
