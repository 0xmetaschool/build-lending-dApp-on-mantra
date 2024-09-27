import React from "react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <Box textAlign="center">
      <Heading as="h1" size="xl" mb={8}>Welcome to the Lending dApp</Heading>
      <Text fontSize="xl" mb={8}>Start earning interest on your USD or borrow OM tokens</Text>
      <Box>
        <Button as={Link} to="/stake" colorScheme="blue" size="lg" mr={4}>Stake USD</Button>
        <Button as={Link} to="/borrow-repay" colorScheme="green" size="lg">Borrow OM</Button>
      </Box>
    </Box>
  );
}