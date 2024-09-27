import React, { useState, useEffect, useCallback } from "react";
import { Box, Heading, Text, Input, Button, useToast } from "@chakra-ui/react";
import { useAccount } from "graz";
import { useLendingContract } from '../hooks/useLendingContract';
import { USD_TOKEN_ADDRESS } from '../chain';

export default function Stake() {
  const { data: account } = useAccount();
  const { stake, loading, checkBalance } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);

  const checkUsdBalance = useCallback(async () => {
    if (!account) return;
    const balance = await checkBalance(USD_TOKEN_ADDRESS);
    setUsdBalance(balance);
  }, [account, checkBalance]);

  useEffect(() => {
    checkUsdBalance();
  }, [checkUsdBalance]);

  const handleStake = useCallback(async () => {
    try {
      await stake(amount);
      showToast("Staked successfully!", "success");
      checkUsdBalance();
    } catch (error) {
      console.error("Stake failed:", error);
      showToast("Error staking. Please try again.", "error");
    }
  }, [stake, amount, checkUsdBalance]);

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
      <Heading as="h2" size="xl" mb={8}>Stake USD</Heading>
      <Text fontSize="xl" mb={4}>Balance: {usdBalance} USD</Text>
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Enter amount to stake"
        mb={4}
      />
      <Button
        onClick={handleStake}
        isLoading={loading}
        loadingText="Staking"
        colorScheme="blue"
        size="lg"
      >
        Stake
      </Button>
    </Box>
  );
}