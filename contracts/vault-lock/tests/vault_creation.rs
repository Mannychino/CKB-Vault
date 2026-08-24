
use ckb_testtool::context::Context;

use ckb_types::{
    bytes::Bytes,
    core::{TransactionBuilder, TransactionView},
    packed::{CellInput, CellOutput, OutPoint, Script},
    prelude::*,
};

fn build_lock_script(context: &mut Context, contract_bin: Vec<u8>) -> Script {
    let out_point = context.deploy_cell(contract_bin.into());

    context
        .build_script(&out_point, Bytes::new())
        .expect("failed to build vault lock script")
}

fn create_funding_cell(
    context: &mut Context,
    funding_lock: Script,
    capacity: u64,
) -> OutPoint {
    context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(funding_lock)
            .build(),
        Bytes::new(),
    )
}

fn build_vault_creation_transaction(
    context: &mut Context,
    funding_out_point: OutPoint,
    vault_lock: Script,
    capacity: u64,
    timelock: u64,
) -> TransactionView {
    let input = CellInput::new_builder()
        .previous_output(funding_out_point)
        .build();

    let vault_output = CellOutput::new_builder()
        .capacity(capacity)
        .lock(vault_lock)
        .build();

    let vault_data = Bytes::from(timelock.to_le_bytes().to_vec());

    let tx = TransactionBuilder::default()
        .input(input)
        .output(vault_output)
        .output_data(vault_data.pack())
        .build();

    context.complete_tx(tx)
}

fn setup_creation_transaction() -> (Context, TransactionView, Script) {
    let mut context = Context::default();

    let contract_path = std::env::current_dir()
        .unwrap()
        .join("target/riscv64imac-unknown-none-elf/release/vault-lock");

    let contract_bin =
        std::fs::read(contract_path).expect("failed to read compiled vault-lock contract");

    let vault_lock = build_lock_script(&mut context, contract_bin);

    // let funding_lock = context
    //     .build_script(
    //         &context.deploy_cell(
    //             ckb_testtool::builtin::ALWAYS_SUCCESS.clone().into(),
    //         ),
    //         Bytes::new(),
    //     )
    //     .expect("failed to build funding lock");
let funding_out_point = context.deploy_cell(
    ckb_testtool::builtin::ALWAYS_SUCCESS.clone().into(),
);

let funding_lock = context
    .build_script(&funding_out_point, Bytes::new())
    .expect("failed to build funding lock");




    let funding_out_point = create_funding_cell(
        &mut context,
        funding_lock,
        1000u64,
    );

    let tx = build_vault_creation_transaction(
        &mut context,
        funding_out_point,
        vault_lock.clone(),
        1000u64,
        100u64,
    );

    (context, tx, vault_lock)
}

#[test]
fn test_vault_creation_succeeds() {
    let (context, tx, _) = setup_creation_transaction();

    context
        .verify_tx(&tx, 10_000_000)
        .expect("vault creation transaction should succeed");

    println!("Vault creation transaction correctly accepted!");
}

#[test]
fn test_vault_cell_contains_timelock() {
    let (_, tx, _) = setup_creation_transaction();

    let output_data = tx
        .outputs_data()
        .get(0)
        .expect("vault output data should exist");

    let data = output_data.raw_data();

    assert_eq!(
        data.len(),
        8,
        "vault cell data should contain exactly 8 bytes"
    );

    let mut timelock_bytes = [0u8; 8];
    timelock_bytes.copy_from_slice(&data[..8]);

    let timelock = u64::from_le_bytes(timelock_bytes);

    assert_eq!(
        timelock, 100u64,
        "vault cell should contain timelock 100"
    );

    println!("Vault cell correctly contains timelock = 100!");
}

#[test]
fn test_vault_cell_capacity() {
    let (context, tx, _) = setup_creation_transaction();

    let vault_output = tx
        .outputs()
        .get(0)
        .expect("vault output should exist");

    assert_eq!(
        ckb_types::prelude::Unpack::<u64>::unpack(&vault_output.capacity()),
        1000u64,
        "vault cell should contain 1000 CKB"
    );

    println!("Vault cell correctly contains 1000 CKB!");
}
