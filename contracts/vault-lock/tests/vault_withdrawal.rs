
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
        .expect("failed to build lock script")
}

fn create_vault(
    context: &mut Context,
    lock_script: Script,
    capacity: u64,
    timelock: u64,
) -> OutPoint {
    context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(lock_script)
            .build(),
        Bytes::from(timelock.to_le_bytes().to_vec()),
    )
}

fn build_withdrawal_transaction(
    context: &mut Context,
    vault_out_point: OutPoint,
    beneficiary_lock: Script,
    since: u64,
) -> TransactionView {
    let input = CellInput::new_builder()
        .previous_output(vault_out_point)
        .since(since)
        .build();

    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(beneficiary_lock)
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output)
        .output_data(Bytes::new().pack())
        .build();

    context.complete_tx(tx)
}

fn setup_vault() -> (Context, OutPoint, Script) {
    let mut context = Context::default();

    let contract_path = std::env::current_dir()
        .unwrap()
        .join("target/riscv64imac-unknown-none-elf/release/vault-lock");

    let contract_bin =
        std::fs::read(contract_path).expect("failed to read compiled vault-lock contract");

    let vault_lock = build_lock_script(&mut context, contract_bin);

    let vault_out_point = create_vault(
        &mut context,
        vault_lock.clone(),
        1000u64,
        100u64,
    );

    (context, vault_out_point, vault_lock)
}

#[test]
fn test_withdrawal_before_timelock_rejected() {
    let (mut context, vault_out_point, vault_lock) = setup_vault();

    let tx = build_withdrawal_transaction(
        &mut context,
        vault_out_point,
        vault_lock,
        99u64,
    );

    let result = context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "withdrawal should be rejected before timelock"
    );

    println!("Early withdrawal correctly rejected!");
}

#[test]
fn test_withdrawal_at_timelock_allowed() {
    let (mut context, vault_out_point, vault_lock) = setup_vault();

    let tx = build_withdrawal_transaction(
        &mut context,
        vault_out_point,
        vault_lock,
        100u64,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("withdrawal should succeed at timelock");

    println!("Withdrawal at timelock correctly accepted!");
}

#[test]
fn test_withdrawal_after_timelock_allowed() {
    let (mut context, vault_out_point, vault_lock) = setup_vault();

    let tx = build_withdrawal_transaction(
        &mut context,
        vault_out_point,
        vault_lock,
        101u64,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("withdrawal should succeed after timelock");

    println!("Withdrawal after timelock correctly accepted!");
}

