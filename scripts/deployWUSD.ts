import { toNano } from '@ton/core';
import { WUSD } from '../wrappers/WUSD';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const wU = provider.open(
        WUSD.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 5,
            },
            await compile('WU')
        )
    );

    await wU.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(wU.address);

    console.log('ID', await wU.getID());
}
