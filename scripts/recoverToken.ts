import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {WUSD} from "../wrappers/WUSD"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]){

    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    const recoverValue = toNano(args[0]);
    const recoverAddress = Address.parse(args[1]);

    console.log("recover address:", recoverAddress);
    console.log("recover value:", recoverValue);

    const recoverResult = await wusd.sendRecover(provider.sender(), {
        value: toNano('0.03'),
        jettonValue: recoverValue,
        toAddress: recoverAddress,
        respAddress: provider.sender().address!
    })

    console.log("recoverResult",recoverResult)

}