use ckb_testtool::{
    builtin::ALWAYS_SUCCESS,
    context::Context,
};

use ckb_types::{
    bytes::Bytes,
    core::{TransactionBuilder, TransactionView},
    packed::{CellInput, CellOutput, OutPoint, Script},
    prelude::*,
};

fn build_lock_script(
    context: &mut Context,
    contract_bin: Vec<u8>,
) -> Script {
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

fn withdraw_vault(
    context: &mut Context,
    vault_out_point: OutPoint,
    lock_script: Script,
    since: u64,
) -> TransactionView {
    let input = CellInput::new_builder()
        .previous_output(vault_out_point)
        .since(since)
        .build();

    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .build();

    let tx = TransactionBuilder::default()
        .input(input)
        .output(output)
        .output_data(Bytes::new().pack())
        .build();

    context.complete_tx(tx)
}

fn withdraw_vault_with_extra_input(
    context: &mut Context,
    extra_input: OutPoint,
    vault_out_point: OutPoint,
    lock_script: Script,
    since: u64,
) -> TransactionView {
    let normal_input = CellInput::new_builder()
        .previous_output(extra_input)
        .since(0u64)
        .build();

    let vault_input = CellInput::new_builder()
        .previous_output(vault_out_point)
        .since(since)
        .build();

    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .build();

    let tx = TransactionBuilder::default()
        .input(normal_input)
        .input(vault_input)
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
        std::fs::read(contract_path)
            .expect("failed to read compiled vault-lock contract");

    let lock_script =
        build_lock_script(&mut context, contract_bin);

    let vault_out_point = create_vault(
        &mut context,
        lock_script.clone(),
        1000u64,
        100u64,
    );

    (context, vault_out_point, lock_script)
}

#[test]
fn test_withdraw_before_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        99u64,
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "withdrawal should be rejected before timelock"
    );

    println!("Early withdrawal correctly rejected!");
}

#[test]
fn test_withdraw_at_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        100u64,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("withdrawal should succeed at timelock");

    println!("Withdrawal at timelock correctly accepted!");
}

#[test]
fn test_withdraw_after_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        101u64,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("withdrawal should succeed after timelock");

    println!("Withdrawal after timelock correctly accepted!");
}

#[test]
fn test_relative_since_zero_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Bit 63 = 1 => relative.
    // Metric bits = 00 => block number.
    // Value = 0.
    let relative_since_zero: u64 = 1u64 << 63;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_since_zero,
    );

    let actual_since: u64 = tx
        .inputs()
        .get(0)
        .expect("missing vault input")
        .since()
        .unpack();

    println!(
        "expected since: {:#x}",
        relative_since_zero
    );

    println!(
        "actual tx since: {:#x}",
        actual_since
    );

    assert_eq!(
        actual_since,
        relative_since_zero,
        "withdraw_vault did not preserve relative since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "relative block since = 0 must be rejected"
    );
}

#[test]
fn test_relative_since_100_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Relative flag + block-number value 100.
    let relative_since_100: u64 =
        (1u64 << 63) | 100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_since_100,
    );

    let actual_since: u64 = tx
        .inputs()
        .get(0)
        .expect("missing vault input")
        .since()
        .unpack();

    println!(
        "expected since: {:#x}",
        relative_since_100
    );

    println!(
        "actual tx since: {:#x}",
        actual_since
    );

    assert_eq!(
        actual_since,
        relative_since_100,
        "withdraw_vault did not preserve relative since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "relative block since = 100 must be rejected"
    );
}

#[test]
fn test_absolute_timestamp_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Bit 63 = 0 => absolute.
    // Metric bits = 10 => timestamp.
    // Value = 100.
    let absolute_timestamp: u64 =
        (1u64 << 62) | 100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        absolute_timestamp,
    );

    let actual_since: u64 = tx
        .inputs()
        .get(0)
        .expect("missing vault input")
        .since()
        .unpack();

    println!(
        "expected since: {:#x}",
        absolute_timestamp
    );

    println!(
        "actual tx since: {:#x}",
        actual_since
    );

    assert_eq!(
        actual_since,
        absolute_timestamp,
        "withdraw_vault did not preserve timestamp since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "absolute timestamp since must be rejected"
    );
}

#[test]
fn test_invalid_since_flags_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Metric bits 11 are invalid.
    // Value = 100.
    let invalid_since: u64 =
        (3u64 << 61) | 100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        invalid_since,
    );

    let actual_since: u64 = tx
        .inputs()
        .get(0)
        .expect("missing vault input")
        .since()
        .unpack();

    println!(
        "expected since: {:#x}",
        invalid_since
    );

    println!(
        "actual tx since: {:#x}",
        actual_since
    );

    assert_eq!(
        actual_since,
        invalid_since,
        "withdraw_vault did not preserve invalid since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "invalid since flags must be rejected"
    );
}

#[test]
fn test_vault_not_first_global_input() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Deploy an unrelated script that always succeeds.
    let always_success_out_point =
        context.deploy_cell(ALWAYS_SUCCESS.clone());

    let always_success_lock = context
        .build_script(
            &always_success_out_point,
            Bytes::new(),
        )
        .expect("failed to build always-success lock");

    // Create an unrelated Cell.
    let extra_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(always_success_lock)
            .build(),
        Bytes::new(),
    );

    // Global transaction layout:
    //
    // Input 0 = unrelated always-success Cell
    // Input 1 = Vault Cell
    //
    // vault-lock must still read GroupInput 0,
    // which refers to the Vault Cell.
    let tx = withdraw_vault_with_extra_input(
        &mut context,
        extra_cell,
        vault_out_point,
        lock_script,
        100u64,
    );

    let inputs = tx.inputs();

    let input_0_since: u64 = inputs
        .get(0)
        .expect("missing global input 0")
        .since()
        .unpack();

    let input_1_since: u64 = inputs
        .get(1)
        .expect("missing vault input")
        .since()
        .unpack();

    println!(
        "global input 0 since: {}",
        input_0_since
    );

    println!(
        "global input 1 vault since: {}",
        input_1_since
    );

    assert_eq!(
        input_0_since,
        0u64,
        "first global input should be unrelated"
    );

    assert_eq!(
        input_1_since,
        100u64,
        "second global input should be the vault"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_ok(),
        "vault should validate when it is not global input 0: {:?}",
        result
    );
}