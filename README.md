# 🪙 Vault Contract (Solana Anchor)

A Solana smart contract built using the **Anchor framework** that allows users to securely deposit and withdraw SPL tokens.  
The vault is controlled by a **Program Derived Address (PDA)**, ensuring that no user has direct authority over the stored tokens.

---

## ⚙️ Features

- **Initialize Vault:**  
  Creates a `vault_metadata` PDA and a `vault_account` PDA.  
  The `vault_account` is a token account that holds deposited tokens.

- **Deposit Tokens:**  
  Users can deposit a specified amount of SPL tokens into the vault.  
  Tokens are transferred from the user’s ATA (Associated Token Account) to the PDA-controlled vault.

- **Withdraw Tokens:**  
  The PDA-authorized vault transfers tokens back to the user.  
  Withdrawals are signed by the PDA (not the user).

---

## 🧩 Program Architecture

### Accounts:
- **vault_metadata (PDA):**  
  Stores vault state such as seller, token mint, and total deposited amount.
  
- **vault_account (PDA):**  
  The token account that actually holds the SPL tokens.
  
- **user_token_ata:**  
  User’s token account used for deposit and withdrawal.

### PDA Derivation:
```rust
seeds = [b"vault_metadata", seller.key().as_ref()]
seeds = [b"vault_account", seller.key().as_ref()]
