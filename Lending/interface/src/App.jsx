import React from "react";
import { Box, useColorMode, Container, Button, useToast, Flex, Spacer, Text } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { useAccount, useConnect, useDisconnect } from "graz";
import { checkKeplrInstalled, getKeplrInstallUrl } from './utils/keplrUtils';
import Home from "./pages/Home";
import Stake from "./pages/Stake";
import BorrowRepay from "./pages/BorrowRepay";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";

export default function App() {
  const { data: account, isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();

  const connectWallet = async () => {
    if (!checkKeplrInstalled()) {
      const installUrl = getKeplrInstallUrl();
      if (window.confirm("Keplr wallet is not installed. Would you like to install it now?")) {
        window.open(installUrl, '_blank');
      }
    } else {
      try {
        await connect({ chainId: "mantra-hongbai-1" });
      } catch (error) {
        console.error("Failed to connect:", error);
        showToast("Failed to connect. Please make sure Keplr is set up correctly.", "error");
      }
    }
  };

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
    <Router>
      <Box minH="100vh" minW="100vw" bg={colorMode === "dark" ? "gray.800" : "gray.100"}>
        {/* Navigation */}
        <Box bg={colorMode === "dark" ? "gray.700" : "white"} py={4} px={8} boxShadow="md">
          <Flex align="center">
            <Text fontSize="xl" fontWeight="bold" mr={8}>Lending dApp</Text>
            <Link to="/" style={{ marginRight: "1rem" }}>Home</Link>
            <Link to="/stake" style={{ marginRight: "1rem" }}>Stake</Link>
            <Link to="/borrow-repay">Borrow/Repay</Link>
            <Spacer />
            {account && (
              <Button variant="outline" colorScheme="blue" mr={4}>
                {account.bech32Address.slice(0, 8)}...{account.bech32Address.slice(-4)}
              </Button>
            )}
            <Button
              onClick={() => isConnected ? disconnect() : connectWallet()}
              isLoading={isConnecting || isReconnecting}
              loadingText="Connecting"
              colorScheme="blue"
              mr={4}
            >
              {isConnected ? "Disconnect" : "Connect Wallet"}
            </Button>
            <Button onClick={toggleColorMode}>
              {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>
          </Flex>
        </Box>

        {/* Routes */}
        <Container maxW="container.xl" py={8}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stake" element={<Stake />} />
            <Route path="/borrow-repay" element={<BorrowRepay />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}