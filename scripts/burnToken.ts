import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {WUSD} from "../wrappers/WUSD"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]){

    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    const burnValue = toNano(args[0]);

    const mintResult = await wusd.sendBurn(provider.sender(), {
        value: toNano('0.03'),
        jettonValue: burnValue,
        respAddress: provider.sender().address!
    })

    console.log("mintResult",mintResult)

}