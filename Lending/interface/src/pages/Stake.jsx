import React, { useState, useEffect, useCallback } from "react";
import { Box, Heading, Text, Input, Button, useToast } from "@chakra-ui/react";
import { useAccount } from "graz";
import { useLendingContract } from '../hooks/useLendingContract';
import { USD_TOKEN_ADDRESS } from '../chain';

export default function Stake() {
  const { data: account } = useAccount();
  const { 
    stake, 
    loading, 
    getTokenBalance, 
    getTokenAllowance,
    approveToken,
    getUserInfo 
  } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [usdBalance, setUsdBalance] = useState('0');
  const [userInfo, setUserInfo] = useState(null);

  const refreshBalances = useCallback(async () => {
    console.log('Refreshing balances...');
    if (!account?.bech32Address) return;
    try {
      const balance = await getTokenBalance(USD_TOKEN_ADDRESS);
      const info = await getUserInfo();
      console.log('Current balance:', balance);
      console.log('User info:', info);
      
      setUsdBalance(balance || '0');
      setUserInfo(info || null);
    } catch (error) {
      console.error("Error fetching balances:", error);
      setUsdBalance('0');
    }
  }, [account, getTokenBalance, getUserInfo]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  const handleStake = useCallback(async () => {
    if (!amount || Number(amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    try {
      // Ensure we're working with valid numbers
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount)) {
        throw new Error("Invalid amount");
      }

      // Convert to smallest unit (6 decimals)
      const amountInSmallestUnit = (parsedAmount * 1000000).toString();

      console.log('Amount to stake:', amountInSmallestUnit);

      // Check allowance first
      const allowance = await getTokenAllowance(USD_TOKEN_ADDRESS);
      console.log('Current allowance:', allowance);

      if (!allowance || BigInt(allowance) < BigInt(amountInSmallestUnit)) {
        console.log('Approving tokens...');
        await approveToken(USD_TOKEN_ADDRESS, amountInSmallestUnit);
      }

      // Now stake
      console.log('Staking tokens...');
      await stake(amountInSmallestUnit);
      showToast("Staked successfully!", "success");
      
      // Clear input and refresh balances
      setAmount('');
      await refreshBalances();
    } catch (error) {
      console.error("Stake failed:", error);
      showToast(
        error.message || "Error staking. Please try again.", 
        "error"
      );
    }
  }, [stake, amount, getTokenAllowance, approveToken, refreshBalances]);

  const showToast = (message, status) => {
    toast({
      title: status === "error" ? "Error" : "Success",
      description: message,
      status: status,
      duration: 3000,
      isClosable: true,
    });
  };

  // Convert from smallest unit to display unit
  const displayBalance = (balanceStr) => {
    if (!balanceStr || balanceStr === '0') return '0';
    try {
      return (Number(balanceStr) / 1000000).toString();
    } catch (error) {
      console.error('Error converting balance:', error);
      return '0';
    }
  };

  return (
    <Box>
      <Heading as="h2" size="xl" mb={8}>Stake USD</Heading>
      <Text fontSize="xl" mb={4}>Balance: {displayBalance(usdBalance)} USD</Text>
      {userInfo && (
        <Text fontSize="xl" mb={4}>
          Staked Amount: {displayBalance(userInfo.staked_amount)} USD
        </Text>
      )}
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount to stake"
        mb={4}
        min="0"
        step="0.000001"
      />
      <Button
        onClick={handleStake}
        isLoading={loading}
        loadingText="Staking"
        colorScheme="blue"
        size="lg"
        isDisabled={!account || !amount || Number(amount) <= 0}
      >
        Stake
      </Button>
    </Box>
  );
}