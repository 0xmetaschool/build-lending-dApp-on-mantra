import React, { useState, useEffect, useCallback } from "react";
import { Box, Heading, Text, Input, Button, useToast } from "@chakra-ui/react";
import { useAccount } from "graz";
import { useLendingContract } from '../hooks/useLendingContract';
import { OM_TOKEN_ADDRESS } from '../chain';

export default function BorrowRepay() {
  const { data: account } = useAccount();
  const { borrow, repay, loading, checkBalance } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState(0);
  const [omBalance, setOmBalance] = useState(0);

  const checkOmBalance = useCallback(async () => {
    if (!account) return;
    const balance = await checkBalance(OM_TOKEN_ADDRESS);
    setOmBalance(balance);
  }, [account, checkBalance]);

  useEffect(() => {
    checkOmBalance();
  }, [checkOmBalance]);

  const handleBorrow = useCallback(async () => {
    try {
      await borrow(amount);
      showToast("Borrowed successfully!", "success");
      checkOmBalance();
    } catch (error) {
      console.error("Borrow failed:", error);
      showToast("Error borrowing. Please try again.", "error");
    }
  }, [borrow, amount, checkOmBalance]);

  const handleRepay = useCallback(async () => {
    try {
      await repay(amount);
      showToast("Repaid successfully!", "success");
      checkOmBalance();
    } catch (error) {
      console.error("Repay failed:", error);
      showToast("Error repaying. Please try again.", "error");
    }
  }, [repay, amount, checkOmBalance]);

  const showToast = (message, status) => {
    toast({
      title: status === "error" ? "Error" : "Success",
      description: message,
      status: status,
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box>
      <Heading as="h2" size="xl" mb={8}>Borrow/Repay OM</Heading>
      <Text fontSize="xl" mb={4}>Balance: {omBalance} OM</Text>
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