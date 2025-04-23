import { toNano, Address } from '@ton/core';
import { WUSD } from '../wrappers/WUSD';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {

    // 编译 JettonWallet 合约代码
    let jettonWalletCode = await compile('JettonWallet');
    
    // 编译 WUSD 合约代码
    let wusdCode = await compile('WUSD');

    console.log("provider",provider)
    // 创建 WUSD 合约实例
    const wusd = provider.open(
        WUSD.createFromConfig(
            {
                totalSupply: 0,
                adminAddress: provider.sender().address!,
                name: "Worldwide USD",
                symbol: "WUSD",
                decimals: 18,
                wallet_code: jettonWalletCode,
                minterAddress: provider.sender().address!,
                burnerAddress: provider.sender().address!,
            },
            wusdCode
        )
    );

    // 部署合约
    await wusd.sendDeploy(provider.sender(), toNano(0.1));

    // 等待合约部署完成
    await provider.waitForDeploy(wusd.address);

    // 打印合约地址
    console.log('WUSD deployed at:', wusd.address.toString());
    
    // 打印部署者地址
    console.log('Deployer address:', provider.sender().address?.toString());
    
    // 打印合约配置信息
    console.log('Contract configuration:');

}
