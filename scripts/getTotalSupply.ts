import { WUSD } from '../wrappers/WUSD';
import {NetworkProvider} from "@ton/blueprint";
import {Address} from "@ton/core"; // 替换为你的 WUSD 合约类路径

export async function run(provider: NetworkProvider) {
    // 1. 加载已部署的 WUSD 合约
    const wusdAddress = Address.parse('EQApPrVQhBzwg2C5XMZTL3Z5G9hIbjLftJlu82s8MY7eBd7H'); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    // 2. 调用 get_total_supply 方法
    const totalSupply = await wusd.getTotalSupply();
    console.log('Total Supply:', totalSupply.toString());
}