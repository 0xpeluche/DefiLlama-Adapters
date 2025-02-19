const ADDRESSES = require('../helper/coreAssets.json');
const axios = require('axios');

const query_url = "https://api.maple.finance/v2/graphql";
const stSYRUP = "0xc7E8b36E0766D9B04c93De68A9D47dD11f260B45"

const query = `
  query example($block: Block_height) {
    poolV2S(block: $block) {
      id
      name
      collateralValue
      principalOut
      tvl
      assets
      asset {
        symbol
      }
      poolMeta {
        state
        asset
        poolCollaterals {
          addresses
          asset
          assetAmount
        }
      }
    }
  }
`;


const getPools = async (block) => {
  const payload = {
    query,
    variables: { block: { number: block - 10 } },
    headers: { "Content-Type": "application/json" }
  };

  const { data } = await axios.post(query_url, payload);
  return data.data.poolV2S;
};

const processPools = async (api, key) => {
  const block = await api.getBlock();
  const pools = await getPools(block);

  pools.forEach((pool) => {
    const { asset, assets, collateralValue, principalOut, poolMeta } = pool
    const token = ADDRESSES.ethereum[asset.symbol] ?? null
    if (!token || poolMeta.state === "Inactive") return;
    const balance = key === "collateralValue" ? Number(collateralValue) + Number(assets) : Number(principalOut)
    api.add(token, balance)
  })
};

const staking = async (api) => {
  const START_BLOCK = 20735662
  const block = await api.getBlock()
  if (block < START_BLOCK) return;
  return api.erc4626Sum({ calls: [stSYRUP], tokenAbi: 'address:asset', balanceAbi: 'uint256:totalAssets' })
}

module.exports = {
  ethereum: { 
    tvl: async (api) => processPools(api, "collateralValue"),
    borrowed: async (api) => processPools(api),
    staking
  }
};
