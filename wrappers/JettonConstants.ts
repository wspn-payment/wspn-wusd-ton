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
    static change_minter = 0xc9e8a8d0;
    static change_burner = 0x96d0ae07;
    static salvage = 0xa33fe996;
}

export abstract class Errors {
    static invalid_op = 709;
    static not_admin  = 73;
    static unouthorized_burn = 74;
    static discovery_fee_not_matched = 75;
    static wrong_op = 0xffff;
    static not_owner = 705;
    static not_enough_ton = 709;
    static not_enough_gas = 707;
    static not_valid_wallet = 707;
    static wrong_workchain = 333;
    static balance_error   = 706;
}


