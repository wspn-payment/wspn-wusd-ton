import { WUSD } from '../wrappers/WUSD';
import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {Op} from "../wrappers/JettonConstants"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]): Promise<void> {

    const grantAddress = Address.parse(args[0]);
    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    console.log(provider.sender().address);
    console.log("grant address:",grantAddress)

    const grantResult = await wusd.sendGrantRole(provider.sender(),{
        value: toNano('0.05'),
        grantAddress: provider.sender().address!,
        grantOp: Op.grant_admin
    })

    console.log("grantResult",grantResult)

}