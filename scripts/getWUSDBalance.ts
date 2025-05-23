import { Address } from '@ton/core';
import { WUSD } from '../wrappers/WUSD';
import { JettonWallet } from '../wrappers/JettonWallet';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // WUSD 合约地址
    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!);
    
    // 要查询的钱包地址
    const walletAddress = Address.parse('EQDEGjfdTM3hsrblPyHtIzvupSNDM-yNjStTtt590eEq1mna');

    // 打开 WUSD 合约
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    try {
        // 获取该地址的 JettonWallet 地址
        const jettonWalletAddress = await wusd.getWalletAddress(walletAddress);
        console.log('Jetton Wallet Address:', jettonWalletAddress.toString());

        // 打开 JettonWallet 合约
        const jettonWallet = provider.open(JettonWallet.createFromAddress(jettonWalletAddress));

        // 获取代币余额
        const balance = await jettonWallet.getJettonBalance();
        console.log('\nToken Balance:', balance.toString());

        // 获取代币数据
        const jettonData = await wusd.getJettonData();
        console.log('\nToken Information:');
        console.log('Name:', jettonData.name);
        console.log('Symbol:', jettonData.symbol);
        console.log('Decimals:', jettonData.decimals);
    } catch (error) {
        console.error('Error:', error);
    }
} 