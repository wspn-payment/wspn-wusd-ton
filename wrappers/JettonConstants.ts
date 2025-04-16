export abstract class Op {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static excesses = 0xd53276db;
    static burn = 0x595f07bc;
    static burn_notification = 0x7bdd97de;
    
    static provide_wallet_address = 0x2c76b973;
    static take_wallet_address = 0xd1735400;
    static mint = 21;
    static change_admin = 3;
    static change_content = 4;

    static grant_role = 0xf3a6d21d;
    static remove_role = 0xc6bae5c6;

    static grant_minter = 0xc9e8a8d0;
    static grant_burner = 0x96d0ae07;
    static grant_admin = 0x46cb26b1;
    static grant_recover = 0xdd8f8741;

    static recover = 0xa33fe996;
    static remove_minter = 0x60b579aa;
    static remove_burner = 0x3f8d7f7d;
    static remove_admin = 0x57ff3ada;
    static remove_recover = 0xd855a1de;

    static upgrade = 0x2508d66a;

}

export abstract class Errors {
    static invalid_op = 709;
    static not_admin  = 73;
    static unauthorized_burn = 74;
    static unauthorized_mint = 76;
    static unauthorized_recover = 77;
    static discovery_fee_not_matched = 75;
    static wrong_op = 0xffff;
    static not_owner = 705;
    static not_enough_ton = 709;
    static not_enough_gas = 707;
    static not_valid_wallet = 707;
    static wrong_workchain = 333;
    static balance_error   = 706;
}


