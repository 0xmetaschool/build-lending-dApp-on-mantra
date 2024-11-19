import { useCallback, useState } from 'react';
import { useAccount, useCosmWasmClient } from "graz";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { CONTRACT_ADDRESS, USD_TOKEN_ADDRESS, OM_TOKEN_ADDRESS } from '../chain';
import { GasPrice } from "@cosmjs/stargate";

export function useLendingContract() {
  const { data: account } = useAccount();
  const { data: cosmWasmClient } = useCosmWasmClient();
  const [loading, setLoading] = useState(false);

  const getSigningClient = useCallback(async () => {
    if (!window.keplr) throw new Error("Keplr not found");
    await window.keplr.enable("mantra-dukong-1");
    const offlineSigner = window.keplr.getOfflineSigner("mantra-dukong-1");
    const gasPrice = GasPrice.fromString('0.025uom');
    return await SigningCosmWasmClient.connectWithSigner(
      "https://rpc.dukong.mantrachain.io",
      offlineSigner,
      { gasPrice }
    );
  }, []);

  const getPoolInfo = useCallback(async () => {
    try {
      if (!cosmWasmClient) return null;
      const result = await cosmWasmClient.queryContractSmart(CONTRACT_ADDRESS, {
        get_pool_info: {}
      });
      console.log('Pool info:', result);
      return result;
    } catch (error) {
      console.error('Get pool info error:', error);
      return null;
    }
  }, [cosmWasmClient]);

  const getTokenBalance = useCallback(async (tokenAddress) => {
    try {
      if (!account?.bech32Address || !cosmWasmClient) {
        console.log('Missing account or client');
        return '0';
      }

      console.log('Querying balance for:', {
        token: tokenAddress,
        address: account.bech32Address
      });

      const result = await cosmWasmClient.queryContractSmart(tokenAddress, {
        balance: {
          address: account.bech32Address
        }
      });

      console.log('Balance query result:', result);
      return result.balance;
    } catch (error) {
      console.error('Get balance error:', error);
      return '0';
    }
  }, [account?.bech32Address, cosmWasmClient]);

  const getTokenAllowance = useCallback(async (tokenAddress) => {
    try {
      if (!account?.bech32Address || !cosmWasmClient) return '0';

      const result = await cosmWasmClient.queryContractSmart(tokenAddress, {
        allowance: {
          owner: account.bech32Address,
          spender: CONTRACT_ADDRESS
        }
      });

      return result.allowance;
    } catch (error) {
      console.error('Get allowance error:', error);
      return '0';
    }
  }, [account?.bech32Address, cosmWasmClient]);

  const getUserInfo = useCallback(async () => {
    try {
      if (!account?.bech32Address || !cosmWasmClient) return null;
      
      const result = await cosmWasmClient.queryContractSmart(CONTRACT_ADDRESS, {
        get_user_info: {
          address: account.bech32Address
        }
      });
      
      console.log('User info result:', result);
      return result;
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  }, [account?.bech32Address, cosmWasmClient]);

  const approveToken = useCallback(async (tokenAddress, amount) => {
    if (!account?.bech32Address) throw new Error("No account connected");
    setLoading(true);
    try {
      const signingClient = await getSigningClient();
      const result = await signingClient.execute(
        account.bech32Address,
        tokenAddress,
        {
          increase_allowance: {
            spender: CONTRACT_ADDRESS,
            amount: amount
          }
        },
        "auto"
      );
      console.log('Approval result:', result);
      return result;
    } catch (error) {
      console.error('Approve error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [account?.bech32Address, getSigningClient]);

  const stake = useCallback(async (amount) => {
    if (!account) return;
    setLoading(true);
    try {
      const signingClient = await getSigningClient();
      const amountToStake = BigInt(amount);
      
      console.log("Staking attempt:", {
        amount: amountToStake.toString(),
        token: USD_TOKEN_ADDRESS,
        contract: CONTRACT_ADDRESS
      });

      // Create base64 encoded message
      const stakeMsg = btoa(JSON.stringify({ stake: {} }));
      
      const result = await signingClient.execute(
        account.bech32Address,
        USD_TOKEN_ADDRESS,
        {
          send: {
            contract: CONTRACT_ADDRESS,
            amount: amountToStake.toString(),
            msg: stakeMsg
          }
        },
        "auto"
      );

      console.log('Stake result:', result);
      
      // Wait for a moment and then fetch updated pool info
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getPoolInfo();
      
      return result;
    } catch (error) {
      console.error("Error staking:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [account, getSigningClient, getPoolInfo]);

  const borrow = useCallback(async (amount) => {
    if (!account) return;
    setLoading(true);
    try {
      const signingClient = await getSigningClient();
      const amountToBorrow = BigInt(amount);

      const result = await signingClient.execute(
        account.bech32Address,
        CONTRACT_ADDRESS,
        {
          borrow: {
            amount: amountToBorrow.toString()
          }
        },
        "auto"
      );

      console.log('Borrow result:', result);
      
      // Wait for a moment and then fetch updated info
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getPoolInfo();
      
      return result;
    } catch (error) {
      console.error("Error borrowing:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [account, getSigningClient, getPoolInfo]);

  const repay = useCallback(async (amount) => {
    if (!account) return;
    setLoading(true);
    try {
      const signingClient = await getSigningClient();
      const amountToRepay = BigInt(amount);

      // Create base64 encoded message
      const repayMsg = btoa(JSON.stringify({ repay: {} }));
      
      const result = await signingClient.execute(
        account.bech32Address,
        OM_TOKEN_ADDRESS,
        {
          send: {
            contract: CONTRACT_ADDRESS,
            amount: amountToRepay.toString(),
            msg: repayMsg
          }
        },
        "auto"
      );

      console.log('Repay result:', result);
      
      // Wait for a moment and then fetch updated info
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getPoolInfo();
      
      return result;
    } catch (error) {
      console.error("Error repaying:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [account, getSigningClient, getPoolInfo]);

  return {
    stake,
    borrow,
    repay,
    getTokenBalance,
    getUserInfo,
    getTokenAllowance,
    approveToken,
    getPoolInfo,
    loading
  };
}