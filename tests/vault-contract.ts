import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VaultContract } from "../target/types/vault_contract";
import { PublicKey, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("vault-contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.vaultContract as Program<VaultContract>;

  let vaultMint: PublicKey;
  let vaultMetadataPDA: PublicKey;
  let vaultAccountPDA: PublicKey;

  const admin = provider.wallet.payer as Keypair;

  it("Initializes the vault", async () => {

    vaultMint = await createMint(provider.connection, admin, admin.publicKey, null, 0);
    console.log("Vault Mint Address:", vaultMint.toBase58());

    const adminTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, admin, vaultMint, admin.publicKey);

    [vaultMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_metadata"), admin.publicKey.toBuffer()],
      program.programId
    );
    [vaultAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_account"), admin.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods.initializeVault().accounts({
      admin: admin.publicKey,
      tokenMintAddress: vaultMint,
      tokenAta: adminTokenAccount.address,
      vaultMetadata: vaultMetadataPDA,
      vaultAccount: vaultAccountPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as any).rpc();

    console.log("Transaction signature", tx);

    const vaultMetadata = await program.account.vault.fetch(vaultMetadataPDA);
    assert.equal(vaultMetadata.seller.toBase58(), admin.publicKey.toBase58());
    assert.equal(vaultMetadata.tokenMint.toBase58(), vaultMint.toBase58());
    assert.equal(vaultMetadata.totalDeposite.toNumber(), 0);

    console.log("Vault initialized successfully.");
  });

  it("Deposites tokens into the vault", async () => {
    const user = anchor.web3.Keypair.generate();

    [vaultMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_metadata"), admin.publicKey.toBuffer()],
      program.programId
    );
    [vaultAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_account"), admin.publicKey.toBuffer()],
      program.programId
    );

    const airdropSignature = await provider.connection.requestAirdrop(user.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSignature);


    const userTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, user, vaultMint, user.publicKey);
    await mintTo(provider.connection, admin, vaultMint, userTokenAccount.address, admin, 1000);

    await program.methods.deposite(new anchor.BN(500)).accounts({
      user: user.publicKey,
      userTokenMintAddress: vaultMint,
      userTokenAta: userTokenAccount.address,
      vaultMetadata: vaultMetadataPDA,
      vaultAccount: vaultAccountPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as any).signers([user]).rpc();

    // Check balances after deposit
    let vaultAccountInfo = await getAccount(provider.connection, vaultAccountPDA);
    let userAccountInfo = await getAccount(provider.connection, userTokenAccount.address);
    assert.equal(Number(vaultAccountInfo.amount), 500);
    assert.equal(Number(userAccountInfo.amount), 500);

    console.log("\n--- VAULT STATUS AFTER DEPOSITE ---");
    console.log("Vault Token Account:", Number(vaultAccountInfo.amount));
    console.log("User Token Account:", Number(userAccountInfo.amount));
    console.log("-----------------------------\n");

    await program.methods.withdraw(new anchor.BN(200)).accounts({
      user:user.publicKey,
      userTokenAta:userTokenAccount.address,
      vaultMetadata:vaultMetadataPDA,
      vaultAccount:vaultAccountPDA,
      tokenProgram:TOKEN_PROGRAM_ID,
    } as any).signers([user]).rpc();

    vaultAccountInfo = await getAccount(provider.connection, vaultAccountPDA);
    userAccountInfo = await getAccount(provider.connection, userTokenAccount.address);

    console.log("\n--- VAULT STATUS AFTER WITHDRAW ---");
    console.log("Vault Token Account:", Number(vaultAccountInfo.amount));
    console.log("User Token Account:", Number(userAccountInfo.amount));
    console.log("-----------------------------\n");

    assert.equal(Number(vaultAccountInfo.amount),300);
    assert.equal(Number(userAccountInfo.amount),700);

    })

});
