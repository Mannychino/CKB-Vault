use ckb_testtool::context::Context;

use ckb_types::{
    bytes::Bytes,
    core::{TransactionBuilder, TransactionView},
    packed::{CellInput, CellOutput, OutPoint, Script},
    prelude::*,
};

fn build_vault_lock(context: &mut Context) -> Script {
    let contract_path = std::env::current_dir()
        .unwrap()
        .join("target/riscv64imac-unknown-none-elf/release/vault-lock");

    let contract_bin =
        std::fs::read(contract_path).expect("failed to read compiled vault-lock contract");

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

fn create_vault_cell(
    context: &mut Context,
    vault_lock: Script,
    capacity: u64,
    timelock: u64,
) -> OutPoint {
    context.create_cell(
        CellOutput::new_builder()
            .capacity(capacity)
            .lock(vault_lock)
            .build(),
        Bytes::from(timelock.to_le_bytes().to_vec()),
    )
}

fn withdraw_vault(
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

fn setup_lifecycle() -> (Context, OutPoint, Script) {
    let mut context = Context::default();

    // --------------------------------------------------
    // 1. Deploy vault-lock contract
    // --------------------------------------------------

    let vault_lock = build_vault_lock(&mut context);

    // --------------------------------------------------
    // 2. Create a funding lock
    // --------------------------------------------------

    let funding_code = context.deploy_cell(
        ckb_testtool::builtin::ALWAYS_SUCCESS
            .clone()
            .into(),
    );

    let funding_lock = context
        .build_script(&funding_code, Bytes::new())
        .expect("failed to build funding lock");

    // --------------------------------------------------
    // 3. Create funding cell
    // --------------------------------------------------

    let funding_out_point = create_funding_cell(
        &mut context,
        funding_lock,
        1000u64,
    );

    println!(
        "Funding cell created: {:?}",
        funding_out_point
    );

    // --------------------------------------------------
    // 4. Create Vault Cell
    // --------------------------------------------------

    let vault_out_point = create_vault_cell(
        &mut context,
        vault_lock.clone(),
        1000u64,
        100u64,
    );

    println!(
        "Vault cell created: {:?}",
        vault_out_point
    );

    // --------------------------------------------------
    // 5. Return Vault Cell for withdrawal test
    // --------------------------------------------------

    (
        context,
        vault_out_point,
        vault_lock,
    )
}

#[test]
fn test_complete_vault_lifecycle() {
    let (mut context, vault_out_point, vault_lock) =
        setup_lifecycle();

    // --------------------------------------------------
    // Create withdrawal transaction
    // --------------------------------------------------

    let withdrawal_tx = withdraw_vault(
        &mut context,
        vault_out_point,
        vault_lock,
        100u64,
    );

    // --------------------------------------------------
    // Verify withdrawal
    // --------------------------------------------------

    context
        .verify_tx(&withdrawal_tx, 10_000_000)
        .expect("withdrawal should succeed at timelock");

    println!("Complete vault lifecycle succeeded!");
}