export const mantraChainConfig = {
  chainId: "mantra-dukong-1",
  chainName: "MANTRA Dukong Testnet",
  rpc: "https://rpc.dukong.mantrachain.io",
  rest: "https://api.dukong.mantrachain.io",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "mantra",
    bech32PrefixAccPub: "mantrapub",
    bech32PrefixValAddr: "mantravaloper",
    bech32PrefixValPub: "mantravaloperpub",
    bech32PrefixConsAddr: "mantravalcons",
    bech32PrefixConsPub: "mantravalconspub",
  },
  currencies: [
    {
      coinDenom: "OM",
      coinMinimalDenom: "uom",
      coinDecimals: 6,
      coinGeckoId: "mantra-chain",
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "OM",
      coinMinimalDenom: "uom",
      coinDecimals: 6,
      coinGeckoId: "mantra-chain",
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.03,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: "OM",
    coinMinimalDenom: "uom",
    coinDecimals: 6,
    coinGeckoId: "mantra-chain",
  },
  features: ["cosmwasm"],
};
  
export const CONTRACT_ADDRESS = "Your_contract_address_goes_here";
export const USD_TOKEN_ADDRESS = "Your_usd_token_address_goes_here";
export const OM_TOKEN_ADDRESS = "Your_om_token_address_goes_here";