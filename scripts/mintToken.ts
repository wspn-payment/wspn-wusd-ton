import {Op} from "../wrappers/JettonConstants";
import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {WUSD} from "../wrappers/WUSD"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]){

    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    console.log(provider.sender().address);
    const mintValue = toNano(args[0]);
    console.log("mint value:",mintValue);

    const mintResult = await wusd.sendMint(provider.sender(), {
        value: toNano('0.03'),
        jettonValue: mintValue,
        toAddress: provider.sender().address!
    })

    console.log("mintResult",mintResult)

}