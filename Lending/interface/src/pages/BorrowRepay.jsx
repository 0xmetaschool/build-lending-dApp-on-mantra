import React, { useState, useEffect, useCallback } from "react";
import { Box, Heading, Text, Input, Button, useToast } from "@chakra-ui/react";
import { useAccount } from "graz";
import { useLendingContract } from '../hooks/useLendingContract';
import { OM_TOKEN_ADDRESS } from '../chain';

export default function BorrowRepay() {
  const { data: account } = useAccount();
  const { borrow, repay, loading, getTokenBalance, getUserInfo } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [omBalance, setOmBalance] = useState('0');
  const [userInfo, setUserInfo] = useState(null);

  const refreshBalances = useCallback(async () => {
    if (!account) return;
    try {
      const [balance, info] = await Promise.all([
        getTokenBalance(OM_TOKEN_ADDRESS),
        getUserInfo()
      ]);
      setOmBalance(balance);
      setUserInfo(info);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [account, getTokenBalance, getUserInfo]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  const handleBorrow = useCallback(async () => {
    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    try {
      await borrow(amount);
      showToast("Borrowed successfully!", "success");
      await refreshBalances();
      setAmount('');
    } catch (error) {
      console.error("Borrow failed:", error);
      showToast(
        error.message || "Error borrowing. Please try again.",
        "error"
      );
    }
  }, [borrow, amount, refreshBalances]);

  const handleRepay = useCallback(async () => {
    if (!amount || amount <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    try {
      await repay(amount);
      showToast("Repaid successfully!", "success");
      await refreshBalances();
      setAmount('');
    } catch (error) {
      console.error("Repay failed:", error);
      showToast(
        error.message || "Error repaying. Please try again.",
        "error"
      );
    }
  }, [repay, amount, refreshBalances]);

  const showToast = (message, status) => {
    toast({
      title: status === "error" ? "Error" : "Success",
      description: message,
      status: status,
      duration: 3000,
      isClosable: true,
    });
  };

  const displayBalance = (balance) => {
    return (BigInt(balance) / BigInt(1000000)).toString();
  };

  return (
    <Box>
      <Heading as="h2" size="xl" mb={8}>Borrow/Repay OM</Heading>
      <Text fontSize="xl" mb={4}>Balance: {displayBalance(omBalance)} OM</Text>
      {userInfo && (
        <Text fontSize="xl" mb={4}>
          Borrowed Amount: {displayBalance(userInfo.borrowed_amount)} OM
        </Text>
      )}
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount"
        mb={4}
      />
      <Button
        onClick={handleBorrow}
        isLoading={loading}
        loadingText="Borrowing"
        colorScheme="green"
        size="lg"
        mr={4}
      >
        Borrow
      </Button>
      <Button
        onClick={handleRepay}
        isLoading={loading}
        loadingText="Repaying"
        colorScheme="red"
        size="lg"
      >
        Repay
      </Button>
    </Box>
  );
}