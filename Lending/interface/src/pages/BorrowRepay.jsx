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
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Tooltip
} from "@chakra-ui/react";
import { InfoIcon, WarningIcon } from "@chakra-ui/icons";
import { useAccount } from "graz";
import { useLendingContract } from '../hooks/useLendingContract';
import { OM_TOKEN_ADDRESS } from '../chain';

export default function BorrowRepay() {
  const { data: account } = useAccount();
  const { borrow, repay, loading, getTokenBalance, getUserInfo, getPoolInfo } = useLendingContract();
  const toast = useToast();

  const [amount, setAmount] = useState('');
  const [omBalance, setOmBalance] = useState('0');
  const [userInfo, setUserInfo] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshData = useCallback(async () => {
    if (!account?.bech32Address) return;
    setIsProcessing(true);
    try {
      const [balance, info, pool] = await Promise.all([
        getTokenBalance(OM_TOKEN_ADDRESS),
        getUserInfo(),
        getPoolInfo()
      ]);
      
      console.log('Refresh Data:', {
        balance,
        userInfo: info,
        poolInfo: pool
      });

      setOmBalance(balance || '0');
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

  const calculateMaxBorrow = useCallback(() => {
    if (!userInfo || !poolInfo) return '0';
    const stakedAmount = BigInt(userInfo.staked_amount);
    const collateralRatio = 80n; // 80%
    return (stakedAmount * collateralRatio / 100n).toString();
  }, [userInfo, poolInfo]);

  const handleBorrow = useCallback(async () => {
    if (!amount || Number(amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const amountInSmallestUnit = (Number(amount) * 1000000).toString();
      const maxBorrow = calculateMaxBorrow();

      if (BigInt(amountInSmallestUnit) > BigInt(maxBorrow)) {
        throw new Error(`Cannot borrow more than ${Number(maxBorrow) / 1000000} OM`);
      }

      showToast("Processing borrow request...", "info");
      await borrow(amountInSmallestUnit);
      showToast("Borrowed successfully!", "success");
      
      setAmount('');
      await refreshData();
    } catch (error) {
      console.error("Borrow failed:", error);
      showToast(
        error.message || "Error borrowing. Please try again.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [borrow, amount, calculateMaxBorrow, refreshData]);

  const handleRepay = useCallback(async () => {
    if (!amount || Number(amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const amountInSmallestUnit = (Number(amount) * 1000000).toString();
      
      if (BigInt(amountInSmallestUnit) > BigInt(omBalance)) {
        throw new Error("Insufficient OM token balance");
      }

      showToast("Processing repayment...", "info");
      await repay(amountInSmallestUnit);
      showToast("Repaid successfully!", "success");
      
      setAmount('');
      await refreshData();
    } catch (error) {
      console.error("Repay failed:", error);
      showToast(
        error.message || "Error repaying. Please try again.",
        "error"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [repay, amount, omBalance, refreshData]);

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

  const calculateHealthFactor = () => {
    if (!userInfo || BigInt(userInfo.borrowed_amount) === 0n) return 100;
    const collateralValue = BigInt(userInfo.staked_amount);
    const borrowedValue = BigInt(userInfo.borrowed_amount);
    return Number((collateralValue * 100n) / (borrowedValue * 80n));
  };

  return (
    <Box maxW="1200px" mx="auto" px={4}>
      <VStack spacing={8} align="stretch">
        <Heading as="h2" size="xl">Borrow/Repay OM</Heading>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {/* User Stats */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Your Position</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>OM Balance</StatLabel>
                    <StatNumber>{displayBalance(omBalance)} OM</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Borrowed Amount</StatLabel>
                    <StatNumber>
                      {userInfo ? displayBalance(userInfo.borrowed_amount) : '0'} OM
                    </StatNumber>
                  </Stat>
                </StatGroup>
                <Box>
                  <Text mb={2}>Position Health</Text>
                  <Progress 
                    value={calculateHealthFactor()} 
                    colorScheme={calculateHealthFactor() > 150 ? "green" : calculateHealthFactor() > 120 ? "yellow" : "red"}
                    hasStripe
                  />
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Borrowing Capacity */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="md">Borrowing Capacity</Heading>
                <StatGroup>
                  <Stat>
                    <StatLabel>Available to Borrow</StatLabel>
                    <Tooltip label="80% of your staked amount">
                      <StatNumber>
                        {displayBalance(calculateMaxBorrow())} OM
                      </StatNumber>
                    </Tooltip>
                  </Stat>
                  <Stat>
                    <StatLabel>Collateral</StatLabel>
                    <StatNumber>
                      {userInfo ? displayBalance(userInfo.staked_amount) : '0'} USD
                    </StatNumber>
                  </Stat>
                </StatGroup>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Divider />

        {/* Borrow/Repay Interface */}
        <Card>
          <CardBody>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Borrow</Tab>
                <Tab>Repay</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={6}>
                    {userInfo && BigInt(userInfo.staked_amount) === 0n && (
                      <Alert status="warning">
                        <AlertIcon />
                        You need to stake USD tokens before borrowing
                      </Alert>
                    )}
                    <HStack spacing={4} width="100%">
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount to borrow"
                        min="0"
                        step="0.000001"
                        isDisabled={isProcessing}
                      />
                      <Button
                        w="200px"
                        onClick={handleBorrow}
                        isLoading={isProcessing}
                        loadingText="Processing"
                        colorScheme="green"
                        size="lg"
                        isDisabled={
                          !account || 
                          !amount || 
                          Number(amount) <= 0 || 
                          isProcessing || 
                          (userInfo && BigInt(userInfo.staked_amount) === 0n)
                        }
                      >
                        Borrow
                      </Button>
                    </HStack>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={6}>
                    {userInfo && BigInt(userInfo.borrowed_amount) === 0n && (
                      <Alert status="info">
                        <AlertIcon />
                        You don't have any outstanding loans
                      </Alert>
                    )}
                    <HStack spacing={4} width="100%">
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount to repay"
                        min="0"
                        step="0.000001"
                        isDisabled={isProcessing}
                      />
                      <Button
                        w="200px"
                        onClick={handleRepay}
                        isLoading={isProcessing}
                        loadingText="Processing"
                        colorScheme="red"
                        size="lg"
                        isDisabled={
                          !account || 
                          !amount || 
                          Number(amount) <= 0 || 
                          isProcessing ||
                          (userInfo && BigInt(userInfo.borrowed_amount) === 0n)
                        }
                      >
                        Repay
                      </Button>
                    </HStack>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}