import {Blockchain, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, beginCell, Cell, toNano} from '@ton/core';
import {jettonContentToCell, WUSD} from '../wrappers/WUSD';
import {JettonWallet} from "../wrappers/JettonWallet";
import '@ton/test-utils';
import {compile, sleep} from '@ton/blueprint';
import {Errors} from "../wrappers/JettonConstants";

describe('WUSD', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('WUSD');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let notDeployer: SandboxContract<TreasuryContract>;

    let wusd: SandboxContract<WUSD>;
    let userWallet: any;
    let defaultContent: any;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        let jwallet_code = await compile('JettonWallet');

        deployer = await blockchain.treasury('deployer');
        notDeployer = await blockchain.treasury('notDeployer');
        defaultContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSD", decimals: 18});

        wusd = blockchain.openContract(
            WUSD.createFromConfig(
                {
                    totalSupply: 0,
                    adminAddress: deployer.address,
                    name: "Worldwide USD",
                    symbol: "WUSD",
                    decimals: 18,
                    wallet_code: jwallet_code
                },
                code
            )
        );

        userWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await wusd.getWalletAddress(address)
            )
        );

        const deployResult = await wusd.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: wusd.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and wU are ready to use

        const totalSupply = await wusd.getTotalSupply();
        console.log("totalSupply", totalSupply)

        const totalSupplyAfter = await wusd.getTotalSupply();
        console.log("totalSupplyAfter", totalSupplyAfter);

        const adminAddress = await wusd.getAdminAddress();
        console.log("adminAddress", adminAddress)

        const totalSupplyAfter2 = await wusd.getTotalSupply();
        console.log("totalSupplyAfter2", totalSupplyAfter2);

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2")
        })

        const totalAfterMint = await wusd.getTotalSupply();
        console.log("totalAfterMint", totalAfterMint);

        const burnResult = await wusd.sendBurn(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(3),
            toAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
            respAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2")
        })

        const totalAfterBurn = await wusd.getTotalSupply();
        console.log("totalAfterBurn", totalAfterBurn);

    });

    it('minter admin can change content', async () => {
        let newContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSD", decimals: 18})
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
        let changeContent = await wusd.sendChangeContent(deployer.getSender(), newContent);
        expect((await wusd.getContent()).equals(newContent)).toBe(true);
        changeContent = await wusd.sendChangeContent(deployer.getSender(), defaultContent);
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
    });
    it('not a minter admin can not change content', async () => {
        let newContent = beginCell().storeUint(1,1).endCell();
        let changeContent = await wusd.sendChangeContent(notDeployer.getSender(), newContent);
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
        expect(changeContent.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: wusd.address,
            aborted: true,
            exitCode: Errors.not_admin, // error::unauthorized_change_content_request
        });
    });

    it('provide wallet address', async () => {
        // const walletAddress = await wU.getWalletAddress(Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"));
        // console.log(walletAddress)
        console.log("deployerAddress:", deployer.address)
        const provideResult = await wusd.sendProvideWalletAddress(deployer.getSender(), {
            value: toNano('0.05'),
            ownerAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
            senderAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
        })
        console.log(provideResult)

    });

    it('get wallet address', async () => {
        const walletAddress = await wusd.getWalletAddress(Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"));
        console.log("walletAddress:", walletAddress)
    })

    it('change admin address', async () => {
        const adminAddress = await wusd.getAdminAddress();
        console.log("before change adminAddress", adminAddress)

        const changeResult = await wusd.sendChangeAdmin(deployer.getSender(), {
            value: toNano('0.05'),
            afterAdminAddress: Address.parse("EQDdhET334XLlXwa1JjPRo-2Gvczt8OmRexEOJeUsGmsHlOV")
        });

        await sleep(1000);

        const afterChangeAddress = await wusd.getAdminAddress();
        console.log("after change adminAddress", afterChangeAddress)
    })

    it('get jetton data', async () => {

        const jettonData = await wusd.getJettonData();
        console.log("jetton data:", jettonData)

    })

    it('not wallet owner should not be able to send jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();

        let initialTotalSupply = await wusd.getTotalSupply();
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        const sendResult = await deployerJettonWallet.sendTransfer(notDeployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, toNano('0.05'), null);
        console.log("deployerJettonWallet owner address", deployer.getSender())
        console.log("notDeployer address", notDeployer.getSender())
        expect(sendResult.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            // exitCode: Errors.not_owner, //error::unauthorized_transfer
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
        expect(await wusd.getTotalSupply()).toEqual(initialTotalSupply);

        console.log(sendResult.transactions)
    });

    it('impossible to send too much jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = initialJettonBalance + 1n;
        let forwardAmount = toNano('0.05');
        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, forwardAmount, null);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            // exitCode: Errors.balance_error, //error::not_enough_jettons
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
    });

    it('correct mint jettons to the owner', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("before mint",initialJettonBalance)

        const walletAddress = await wusd.getWalletAddress(deployer.address)
        console.log("walletAddress:",walletAddress)
        console.log("instance address",deployerJettonWallet.address)

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        await sleep(1000);

        initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after mint",initialJettonBalance)
        const  totalSupply = await wusd.getTotalSupply()
        console.log("total supply",totalSupply)

    })

    it('correct send jettons to the other', async ()=>{
        const deployerJettonWallet = await userWallet(deployer.address);
        const unDeployerJettonWallet = await userWallet(notDeployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        await sleep(1000);

        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after mint",initialJettonBalance)

        const sendResult = await deployerJettonWallet.sendTransfer(deployer.getSender(), toNano('0.1'), //tons
            toNano(1), notDeployer.address,
            deployer.address, null, 0, null);

        let afterSendBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after send",afterSendBalance);
        let otherReceived = await unDeployerJettonWallet.getJettonBalance();
        console.log("otherReceived",otherReceived)
    })



});
