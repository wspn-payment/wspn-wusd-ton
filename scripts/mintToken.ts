import {Op} from "../wrappers/JettonConstants";
import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {WUSD} from "../wrappers/WUSD"; // 替换为你的 WUSD 合约类路径

export async function run(provider: NetworkProvider){

    const wusdAddress = Address.parse('EQApPrVQhBzwg2C5XMZTL3Z5G9hIbjLftJlu82s8MY7eBd7H'); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    console.log(provider.sender().address);

    const mintResult = await wusd.sendMint(provider.sender(), {
        value: toNano('0.03'),
        jettonValue: toNano(5),
        toAddress: provider.sender().address!
    })

    console.log("mintResult",mintResult)

}