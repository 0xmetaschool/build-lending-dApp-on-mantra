export const mantraChainConfig = {
  "chainId": "mantra-hongbai-1",
  "chainName": "MANTRA Hongbai Testnet",
  "chainSymbolImageUrl": "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/mantra-hongbai/chain.png",
  "rpc": "https://rpc.hongbai.mantrachain.io",
  "rest": "https://api.hongbai.mantrachain.io",
  "nodeProvider": {
    "name": "MANTRA Chain",
    "email": "contact@mantrachain.io",
    "website":"https://www.mantrachain.io"
  },
  "bip44": {
    "coinType": 118
  },
  "bech32Config": {
    "bech32PrefixAccAddr": "mantra",
    "bech32PrefixAccPub": "mantrapub",
    "bech32PrefixValAddr": "mantravaloper",
    "bech32PrefixValPub": "mantravaloperpub",
    "bech32PrefixConsAddr": "mantravalcons",
    "bech32PrefixConsPub": "mantravalconspub"
  },
  "currencies": [
    {
      "coinDenom": "OM",
      "coinMinimalDenom": "uom",
      "coinDecimals": 6
    }
  ],
  "feeCurrencies": [
    {
      "coinDenom": "OM",
      "coinMinimalDenom": "uom",
      "coinDecimals": 6,
      "gasPriceStep": {
        "low": 0.01,
        "average": 0.025,
        "high": 0.03
      }
    }
  ],
  "stakeCurrency": {
    "coinDenom": "OM",
    "coinMinimalDenom": "uom",
    "coinDecimals": 6
  },
  "features": [
    "cosmwasm"  
  ]
};
  
export const CONTRACT_ADDRESS = "mantra13q453k7ug2ma3wam9f6qexccqav3grpw29gc9v4wqxlqa8ns5vvscelpag";
export const USD_TOKEN_ADDRESS = "mantra1nfwgkq7hkpgdkcpy0phy7h25j5q6hhcewh77fzekjtrmyp34txrqdkxdah";
export const OM_TOKEN_ADDRESS = "mantra1fha3z7tj26ynusrjg8zc2xm2jnuvq43k0gs66pc0s0ndacje3rnsurdc5z";