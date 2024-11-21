import React, { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Divider,
  Container,
  Icon,
  useColorModeValue,
  Center
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { LockIcon, InfoIcon, ArrowUpIcon, CheckCircleIcon } from "@chakra-ui/icons";
import { useLendingContract } from "../hooks/useLendingContract";

export default function Home() {
  const { getPoolInfo } = useLendingContract();
  const [poolInfo, setPoolInfo] = useState(null);
  const bgGradient = useColorModeValue(
    "linear(to-b, blue.50, white)",
    "linear(to-b, gray.900, gray.800)"
  );

  useEffect(() => {
    const fetchPoolInfo = async () => {
      const info = await getPoolInfo();
      setPoolInfo(info);
    };
    fetchPoolInfo();
  }, [getPoolInfo]);

  const displayBalance = (balanceStr) => {
    if (!balanceStr || balanceStr === '0') return '0';
    try {
      return (Number(balanceStr) / 1000000).toFixed(6);
    } catch (error) {
      return '0';
    }
  };

  return (
    <Box 
      minH="calc(90vh - 64px)" // Adjust based on your navbar height
      py={40}
    >
      <Container maxW="container.xl">
        <Center>
          <VStack spacing={8} align="center" w="full">
            {/* Hero Section */}
            <VStack spacing={4} textAlign="center" mb={8}>
              <Heading as="h1" size="2xl">
                Welcome to the Lending dApp
              </Heading>
              <Text fontSize="xl" maxW="2xl" color="gray.600">
                Earn interest on your USD tokens or borrow OM tokens with competitive rates
              </Text>
            </VStack>

            {/* Action Buttons */}
            <HStack spacing={4} mb={12}>
              <Button
                as={Link}
                to="/stake"
                colorScheme="blue"
                size="lg"
                leftIcon={<LockIcon />}
              >
                Stake USD
              </Button>
              <Button
                as={Link}
                to="/borrow-repay"
                colorScheme="green"
                size="lg"
                leftIcon={<InfoIcon />}
              >
                Borrow OM
              </Button>
            </HStack>

            {/* Pool Statistics and Protocol Details */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} w="full" maxW="4xl">
              <Card w="full" variant="elevated">
                <CardBody>
                  <VStack spacing={6} align="start">
                    <Heading size="lg">Pool Statistics</Heading>
                    <StatGroup w="full">
                      <Stat>
                        <StatLabel>Total Staked USD</StatLabel>
                        <StatNumber>
                          {poolInfo ? displayBalance(poolInfo.total_staked) : '0'} USD
                        </StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Total Borrowed OM</StatLabel>
                        <StatNumber>
                          {poolInfo ? displayBalance(poolInfo.total_borrowed) : '0'} OM
                        </StatNumber>
                      </Stat>
                    </StatGroup>
                  </VStack>
                </CardBody>
              </Card>

              <Card w="full">
                <CardBody>
                  <VStack spacing={4} align="start">
                    <Heading size="md">Protocol Details</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                      <Stat>
                        <StatLabel>Collateral Ratio</StatLabel>
                        <StatNumber>80%</StatNumber>
                        <Text fontSize="sm">Maximum borrowing power</Text>
                      </Stat>
                      <Stat>
                        <StatLabel>Interest Rate</StatLabel>
                        <StatNumber>10%</StatNumber>
                        <Text fontSize="sm">Fixed interest rate on borrows</Text>
                      </Stat>
                    </SimpleGrid>
                    <Divider />
                    <Text color="gray.600" fontSize="sm">
                      Maintain a healthy collateral ratio to avoid liquidation risks
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        </Center>
      </Container>
    </Box>
  );
}