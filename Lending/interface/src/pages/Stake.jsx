import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  Input,
  Button,
  useToast,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Card,
  CardBody,
  Progress,
  Divider,
  SimpleGrid
} from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
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
    getUserInfo,
    getPoolInfo 
  } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [usdBalance, setUsdBalance] = useState('0');
  const [userInfo, setUserInfo] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshData = useCallback(async () => {
    if (!account?.bech32Address) return;
    setIsProcessing(true);
    try {
      const [balance, info, pool] = await Promise.all([
        getTokenBalance(USD_TOKEN_ADDRESS),
        getUserInfo(),
        getPoolInfo()
      ]);
      
      console.log('Refresh Data:', {
        balance,
        userInfo: info,
        poolInfo: pool
      });

      setUsdBalance(balance || '0');
      setUserInfo(info || null);
      setPoolInfo(pool || null);
    } catch (error) {
      console.error("Error refreshing data:", error);
      showToast("Error refreshing data", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [account?.bech32Address, getTokenBalance, getUserInfo, getPoolInfo]);

  useEffect(() => {
    refreshData();
    // Set up polling for updates
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleStake = useCallback(async () => {
    if (!amount || Number(amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount)) {
        throw new Error("Invalid amount");
      }

      const amountInSmallestUnit = (parsedAmount * 1000000).toString();
      console.log('Amount to stake:', amountInSmallestUnit);

      const allowance = await getTokenAllowance(USD_TOKEN_ADDRESS);
      console.log('Current allowance:', allowance);

      if (!allowance || BigInt(allowance) < BigInt(amountInSmallestUnit)) {
        showToast("Approving token spending...", "info");
        await approveToken(USD_TOKEN_ADDRESS, amountInSmallestUnit);
      }

      showToast("Staking tokens...", "info");
      await stake(amountInSmallestUnit);
      showToast("Staked successfully!", "success");
      
      setAmount('');
      await refreshData();
    } catch (error) {
      console.error("Stake failed:", error);
      showToast(
        error.message || "Error staking. Please try again.", 
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [stake, amount, getTokenAllowance, approveToken, refreshData]);

  const showToast = (message, status) => {
    toast({
      title: status === "error" ? "Error" : status === "info" ? "Info" : "Success",
      description: message,
      status: status,
      duration: 5000,
      isClosable: true,
      position: "top-right"
    });
  };

  const displayBalance = (balanceStr) => {
    if (!balanceStr || balanceStr === '0') return '0';
    try {
      return (Number(balanceStr) / 1000000).toFixed(6);
    } catch (error) {
      console.error('Error converting balance:', error);
      return '0';
    }
  };

  const calculateUtilization = () => {
    if (!poolInfo) return 0;
    const totalStaked = Number(poolInfo.total_staked);
    if (totalStaked === 0) return 0;
    return (Number(poolInfo.total_borrowed) / totalStaked) * 100;
  };

  return (
    <Box maxW="1200px" mx="auto" px={4}>
      <VStack spacing={8} align="stretch">
        <Heading as="h2" size="xl">Stake USD</Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {/* Stats Card */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Your Statistics</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Wallet Balance</StatLabel>
                    <StatNumber>{displayBalance(usdBalance)} USD</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Staked Amount</StatLabel>
                    <StatNumber>
                      {userInfo ? displayBalance(userInfo.staked_amount) : '0'} USD
                    </StatNumber>
                  </Stat>
                </StatGroup>
              </VStack>
            </CardBody>
          </Card>

          {/* Pool Stats Card */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Pool Statistics</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Total Staked</StatLabel>
                    <StatNumber>
                      {poolInfo ? displayBalance(poolInfo.total_staked) : '0'} USD
                    </StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Borrowed</StatLabel>
                    <StatNumber>
                      {poolInfo ? displayBalance(poolInfo.total_borrowed) : '0'} OM
                    </StatNumber>
                  </Stat>
                </StatGroup>
                <Box>
                  <Text mb={2}>Utilization Rate</Text>
                  <Progress value={calculateUtilization()} colorScheme="blue" hasStripe />
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Divider />

        {/* Stake Form */}
        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md">Stake Tokens</Heading>
              
              <HStack spacing={4}>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to stake"
                  min="0"
                  step="0.000001"
                  isDisabled={isProcessing}
                />
                <Button
                  w="200px"
                  onClick={handleStake}
                  isLoading={isProcessing}
                  loadingText="Processing"
                  colorScheme="blue"
                  size="lg"
                  isDisabled={!account || !amount || Number(amount) <= 0 || isProcessing}
                  leftIcon={<InfoIcon />}
                >
                  Stake
                </Button>
              </HStack>

              {!account && (
                <Text color="red.500">
                  Please connect your wallet to stake tokens
                </Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}