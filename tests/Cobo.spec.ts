const CoboWaas2 = require("@cobo/cobo-waas2");
require('dotenv').config();  // Add this to use environment variables

// Initialize the API client
const apiClient = CoboWaas2.ApiClient.instance;



describe('test the cobo api',()=>{

    it('test the support chain',async ()=>{
        console.log("starting ....")

        // Select the development environment. To use the production environment, replace `Env.DEV` with `Env.PROD`
        apiClient.setEnv(CoboWaas2.Env.DEV);
        // Move private key to .env file
        apiClient.setPrivateKey(process.env.COBO_PRIVATE_KEY);
        // Call the API
        const apiInstance = new CoboWaas2.WalletsApi();

        const opts = {
            wallet_type: "MPC",  // Filter for MPC wallets
            wallet_subtype: "Org-Controlled", // Filter for Org-Controlled wallets
            limit: 50  // Get maximum number of results
        };

        const data = await apiInstance.listEnabledChains(opts);
        if (data.data) {
            console.log("\nAvailable chains:");
            data.data.forEach((chain: any) => {
                console.log(`\nChain ID: ${chain.chain_id}`);
                console.log(`Symbol: ${chain.symbol}`);
                console.log(`Confirmations required: ${chain.confirming_threshold}`);
                console.log(`Explorer URL: ${chain.explorer_tx_url}`);
            });
        }
    })

    it('test balance of the wallet',async ()=>{

        console.log("starting ....")

        // Select the development environment. To use the production environment, replace `Env.DEV` with `Env.PROD`
        apiClient.setEnv(CoboWaas2.Env.DEV);
        // Move private key to .env file
        apiClient.setPrivateKey(process.env.COBO_PRIVATE_KEY);
        // Call the API
        const apiInstance = new CoboWaas2.WalletsApi();

        const opts = {
            limit: 10  // Get maximum number of results
        };

        const walletId = "b666d026-002b-4d24-bd4b-c0d77fff5abe";
        const tokenId = "SETH";

        const data = await apiInstance.listAddressBalancesByTokenWithHttpInfo(walletId,tokenId,opts);

        const info = data.data;
        console.log(info.data)


    })



})