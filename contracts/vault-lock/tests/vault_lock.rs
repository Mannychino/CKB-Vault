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
    required_blocks: u64,
) -> OutPoint {
    context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(lock_script)
            .build(),
        Bytes::from(required_blocks.to_le_bytes().to_vec()),
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
    vault_since: u64,
) -> TransactionView {
    let normal_input = CellInput::new_builder()
        .previous_output(extra_input)
        .since(0u64)
        .build();

    let vault_input = CellInput::new_builder()
        .previous_output(vault_out_point)
        .since(vault_since)
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

    // Vault requires a 100-block relative delay.
    let vault_out_point = create_vault(
        &mut context,
        lock_script.clone(),
        1000u64,
        100u64,
    );

    (context, vault_out_point, lock_script)
}

fn relative_block_since(blocks: u64) -> u64 {
    (1u64 << 63) | blocks
}

#[test]
fn test_withdraw_before_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let relative_99 = relative_block_since(99);

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_99,
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "relative delay of 99 blocks should be rejected"
    );

    println!("Relative 99 correctly rejected!");
}

#[test]
fn test_withdraw_at_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let relative_100 = relative_block_since(100);

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_100,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("relative delay of 100 blocks should succeed");

    println!("Relative 100 correctly accepted!");
}

#[test]
fn test_withdraw_after_timelock() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let relative_101 = relative_block_since(101);

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_101,
    );

    context
        .verify_tx(&tx, 10_000_000)
        .expect("relative delay above required timelock should succeed");

    println!("Relative 101 correctly accepted!");
}

#[test]
fn test_relative_since_zero_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    let relative_0 = relative_block_since(0);

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_0,
    );

    let actual_since: u64 = tx
        .inputs()
        .get(0)
        .expect("missing vault input")
        .since()
        .unpack();

    println!("expected since: {:#x}", relative_0);
    println!("actual tx since: {:#x}", actual_since);

    assert_eq!(
        actual_since,
        relative_0,
        "withdraw_vault did not preserve relative since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "relative delay of 0 blocks must be rejected"
    );
}

#[test]
fn test_absolute_block_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // Absolute block-number since 100.
    let absolute_100 = 100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        absolute_100,
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "absolute block since must be rejected in relative-timelock V1.0.1"
    );
}

#[test]
fn test_relative_timestamp_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // bit 63 = relative
    // metric bits 10 = timestamp
    // value = 100
    let relative_timestamp_100: u64 =
        (1u64 << 63) |
        (1u64 << 62) |
        100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        relative_timestamp_100,
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_err(),
        "relative timestamp since must be rejected"
    );
}

#[test]
fn test_invalid_since_flags_rejected() {
    let (mut context, vault_out_point, lock_script) =
        setup_vault();

    // bit 63 = relative
    // metric bits 11 = invalid
    // value = 100
    let invalid_since: u64 =
        (1u64 << 63) |
        (3u64 << 61) |
        100u64;

    let tx = withdraw_vault(
        &mut context,
        vault_out_point,
        lock_script,
        invalid_since,
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

    let always_success_out_point =
        context.deploy_cell(ALWAYS_SUCCESS.clone());

    let always_success_lock = context
        .build_script(
            &always_success_out_point,
            Bytes::new(),
        )
        .expect("failed to build always-success lock");

    let extra_cell = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64)
            .lock(always_success_lock)
            .build(),
        Bytes::new(),
    );

    let relative_100 = relative_block_since(100);

    let tx = withdraw_vault_with_extra_input(
        &mut context,
        extra_cell,
        vault_out_point,
        lock_script,
        relative_100,
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
        "global input 0 since: {:#x}",
        input_0_since
    );

    println!(
        "global input 1 vault since: {:#x}",
        input_1_since
    );

    assert_eq!(
        input_0_since,
        0u64,
        "first global input should be unrelated"
    );

    assert_eq!(
        input_1_since,
        relative_100,
        "second global input should contain the vault relative since"
    );

    let result =
        context.verify_tx(&tx, 10_000_000);

    assert!(
        result.is_ok(),
        "vault should validate when it is not global input 0: {:?}",
        result
    );
}