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
  
export const CONTRACT_ADDRESS = "mantra193zk3dez6ftdvjn3k3pgrxzsurcaqg6wxqefwdkxk8rjlgg4mnyqd6g84u";
export const USD_TOKEN_ADDRESS = "mantra1e0z5gq09k5874whkdrc4yms5aw0rz5x6gdqvzm3xy009zj320y5quq6u44";
export const OM_TOKEN_ADDRESS = "mantra19uswnfwyvf6j5l8yet487kpaep80kgmqpwc0y6jtflqtqxt08hms57eq9m";