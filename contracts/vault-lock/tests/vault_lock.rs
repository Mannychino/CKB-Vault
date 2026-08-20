use ckb_testtool::{
    context::Context,
};

use ckb_types::{
    bytes::Bytes,
    core::TransactionBuilder,
    packed::{CellInput, CellOutput},
    prelude::*,
};

#[test]
fn test_vault_lock() {
    let mut context = Context::default();

    // Load the compiled RISC-V contract.
    let contract_bin = std::env::current_dir()
        .unwrap()
        .join("target/riscv64imac-unknown-none-elf/release/vault-lock");

    let contract_bin = std::fs::read(contract_bin)
        .expect("failed to read compiled vault-lock contract");

    // Deploy contract.
    let out_point = context.deploy_cell(contract_bin.into());

    // Script args = [42]
    let lock_script = context
        .build_script(&out_point, Bytes::from(vec![42]))
        .expect("failed to build lock script");

    // Create input cell.
   let input_out_point = context.create_cell(
    CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script.clone())
        .build(),
    Bytes::from(100u64.to_le_bytes().to_vec()),
);

let input = CellInput::new_builder()
    .previous_output(input_out_point)
    .since(100u64)
    .build();

    // Create output cell.
    let output = CellOutput::new_builder()
        .capacity(1000u64)
        .lock(lock_script)
        .build();

    // Build transaction.
    let tx = TransactionBuilder::default()
        .input(input)
        .output(output)
        .output_data(Bytes::new().pack())
        .build();

    let tx = context.complete_tx(tx);

    // Verify transaction.
    context
        .verify_tx(&tx, 10_000_000)
        .expect("transaction should pass");

    println!("Vault lock test passed!");
}

